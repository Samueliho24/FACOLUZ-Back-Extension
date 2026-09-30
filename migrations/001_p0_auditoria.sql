-- ============================================================================
--  001_p0_auditoria.sql
--  Migracion P0 del ciclo facturacion -> cobro -> anulacion.
--
--  PARA QUE SIRVE: unicamente para una base que YA tiene datos. Si la base se
--  crea desde cero, usar Docs/FACOLUZ-Docs/DB-Extension.sql, que ya incluye
--  todo esto. Este archivo NO se aplica a una base recien creada.
--
--  Que agrega:
--    - Quien emitio, quien anulo, cuando y por que (hoy no hay ningun rastro).
--    - CHECKs que impiden montos invalidos (total <= 0, cantidad <= 0, negativo).
--    - Indices de lectura del ciclo de caja (hoy las listas son full scan).
--
--  La exoneracion NO agrega columnas: se justifica en el campo de observacion
--  que ya existe (payments.comments). Ver seccion 1.2.
--
--  Todas las columnas nuevas son ADITIVAS y NULLABLE: no se pierde ningun dato
--  y ningun cliente existente se rompe. Los CHECKs solo fallan si hay datos ya
--  invalidos, por eso van despues de la seccion 0.
--
--  ANTES DE APLICAR: copia de seguridad.
--      mysqldump -u root -p faco_luz_extension > respaldo_antes_001.sql
--
--  COMO APLICAR (MariaDB de XAMPP, sin Docker):
--      C:\xampp\mysql\bin\mysql.exe -u root -p faco_luz_extension < migrations/001_p0_auditoria.sql
--
--  Es una migracion de una sola vez: MariaDB no tiene ADD COLUMN IF NOT EXISTS.
--  Si se corre dos veces, falla. Eso es preferible a que aplique dos veces.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. PREVIO: revisar ANTES de continuar.
--
--    Estas consultas no modifican nada. Su salida es la que decide si la
--    seccion 3 (CHECKs) puede aplicarse. Ejecutar y leer.
-- ----------------------------------------------------------------------------

-- 0.1 Facturas con total o cantidad invalidos. Deberia dar 0 filas.
SELECT 'invoices.invalidas' AS control, COUNT(*) AS filas
  FROM `invoices`
 WHERE `chargedAmount` IS NULL OR `chargedAmount` <= 0
    OR `quantity` IS NULL OR `quantity` <= 0;

-- 0.2 Detalle de esas facturas, para saber cuales son y revisarlas con caja.
SELECT `id`, `StudentIdentification`, `billableid`, `quantity`, `chargedAmount`, `status`, `date`
  FROM `invoices`
 WHERE `chargedAmount` <= 0 OR `quantity` <= 0
 ORDER BY `date`;

-- 0.3 Pagos con montos negativos. Deberia dar 0 filas.
SELECT 'payments.montos_negativos' AS control, COUNT(*) AS filas
  FROM `payments`
 WHERE `paidAmount` < 0 OR `returnedAmount` < 0;

-- 0.4 Detalle. Un monto negativo en un pago es siempre un dato corrupto: la
--     ruta de cobro validaba 0 <= returnedAmount <= paidAmount.
SELECT `id`, `invoiceId`, `paidAmount`, `returnedAmount`, `receivedPaymentMethod`, `date`
  FROM `payments`
 WHERE `paidAmount` < 0 OR `returnedAmount` < 0
 ORDER BY `date`;

-- 0.5 Pagos que devuelven mas de lo pagado. Deberia dar 0 filas.
SELECT 'payments.devuelve_mas' AS control, COUNT(*) AS filas
  FROM `payments`
 WHERE `returnedAmount` > `paidAmount`;

-- 0.6 Control de cierre: cuantos pagos y cuanto dinero hay hoy. Se usa para
--     conciliar despues de aplicar la migracion.
SELECT 'antes' AS momento,
       COUNT(*) AS pagos,
       ROUND(SUM(`paidAmount`), 2) AS pagado,
       ROUND(SUM(`returnedAmount`), 2) AS devuelto
  FROM `payments`;

-- ----------------------------------------------------------------------------
-- 1. AUDITORIA. Quien hizo que.
-- ----------------------------------------------------------------------------

-- 1.1 Emision: las facturas se facturan a nombre del estudiante, pero las
--     emite un usuario. Sin esto, con dos personas facturando, no se puede
--     saber quien emitio una factura equivocada.
ALTER TABLE `invoices`
  ADD COLUMN `issuedBy`       int(11) unsigned DEFAULT NULL COMMENT 'users.id de quien emitio la factura. Sin esto, con dos personas facturando, no hay forma de saber quien emitio una factura equivocada',
  ADD COLUMN `cancelledAt`    datetime DEFAULT NULL COMMENT 'Momento de la anulacion. Anular dos veces la misma factura queda bloqueado por status',
  ADD COLUMN `cancelledBy`    int(11) unsigned DEFAULT NULL COMMENT 'users.id de quien anulo',
  ADD COLUMN `cancelledReason` text DEFAULT NULL COMMENT 'Motivo de la anulacion. El backend lo exige: una anulacion sin motivo no se puede devolver';

-- Las columnas apuntan de verdad a users, igual que changelogs.fk_user. Sin la FK
-- se puede escribir un issuedBy = 999 que no corresponde a nadie, y la auditoria
-- vale menos que un campo de texto libre.
ALTER TABLE `invoices`
  ADD KEY `fk_invoices_issued_by` (`issuedBy`),
  ADD KEY `fk_invoices_cancelled_by` (`cancelledBy`),
  ADD CONSTRAINT `fk_invoices_issued_by` FOREIGN KEY (`issuedBy`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_invoices_cancelled_by` FOREIGN KEY (`cancelledBy`) REFERENCES `users` (`id`);

-- 1.2 Exoneracion: es dinero que no entra, asi que hay que dejar escrito por que
--     y quien lo autorizo. Va en el MISMO campo de observacion que ya existe
--     (decision D4): no se agregan columnas, porque separar "motivo" de
--     "autorizador" solo agrega campos que nadie va a llenar.
--     El backend todavia no lo exige: se activa en la tarea T8 del plan P0.
--     Ver la columna payments.comments en el esquema.

-- ----------------------------------------------------------------------------
-- 2. INDICES de lectura del ciclo de caja.
--
--    ConsultarRegistros y el reporte diario filtran por fecha, por estudiante y
--    por estado. Sin estos indices, cada pantalla de caja barre la tabla entera.
-- ----------------------------------------------------------------------------

CREATE INDEX `idx_invoices_date`    ON `invoices` (`date`);
CREATE INDEX `idx_invoices_student` ON `invoices` (`StudentIdentification`, `date`);
CREATE INDEX `idx_invoices_status`  ON `invoices` (`status`);
CREATE INDEX `idx_payments_date`    ON `payments` (`date`);

-- ----------------------------------------------------------------------------
-- 3. INTEGRIDAD DE MONTOS.
--
--    Primero repara, despues restringe. Si una seccion 0 devolvio filas, el
--    UPDATE de abajo las corrige; si el CHECK aun falla, es que hay un dato que
--    este script no sabe arreglar: NO forzar el CHECK, revisar el dato a mano.
-- ----------------------------------------------------------------------------

-- 3.1 `quantity` es un campo informativo (cuantas unidades del concepto), no el
--     monto cobrado: el monto es `chargedAmount`. Cuando la validacion de la
--     cantidad llego tarde quedaron facturas con 0 o negativo; el total que se
--     cobro sigue siendo valido, asi que se normaliza a 1 sin tocar el dinero.
--     La lista de afectadas quedo en 0.2.
UPDATE `invoices` SET `quantity` = 1 WHERE `quantity` <= 0;

-- 3.2 Un monto negativo es un dato corrupto, no una devolucion. Se lleva a 0
--     para que el saldo de esa factura sea el correcto; la lista de afectadas
--     quedo en 0.4 y hay que revisarla con caja.
UPDATE `payments` SET `paidAmount` = 0 WHERE `paidAmount` < 0;
UPDATE `payments` SET `returnedAmount` = 0 WHERE `returnedAmount` < 0;

-- 3.3 Los CHECK. En MariaDB (10.2+) se cumplen siempre; no hay NOT ENFORCED.
--     Si alguno falla al aplicarse, el mensaje de error dice que constraint es.
ALTER TABLE `invoices`
  ADD CONSTRAINT `chk_invoices_charged_positive`  CHECK (`chargedAmount` > 0),
  ADD CONSTRAINT `chk_invoices_quantity_positive` CHECK (`quantity` > 0);

ALTER TABLE `payments`
  ADD CONSTRAINT `chk_payments_paid_nonneg`      CHECK (`paidAmount` >= 0),
  ADD CONSTRAINT `chk_payments_returned_nonneg`  CHECK (`returnedAmount` >= 0);

-- 3.4 Un pago no puede devolver mas de lo que pago. Es la misma regla que valida
--     POST /api/payments, pero desde la base: asi tampoco la puede saltar una
--     correccion manual ni un script futuro.
ALTER TABLE `payments`
  ADD CONSTRAINT `chk_payments_returned_le_paid` CHECK (`returnedAmount` IS NULL OR `returnedAmount` <= `paidAmount`);

-- 3.5 Si se exonera, la observacion no es opcional: debe decir por que y quien
--     lo autorizo (decision D4, un solo campo de texto).
--     PENDIENTE: no se agrega aqui a proposito. El backend todavia acepta una
--     exoneracion sin observacion (eso es la tarea T8 del plan), y un CHECK que
--     el codigo no respeta no es una proteccion: es un 500 crudo cada vez que
--     alguien exonera a un estudiante. Se agrega junto con la validacion del
--     backend, en migrations/002_exoneracion_observada.sql.
--
-- ALTER TABLE `payments`
--   ADD CONSTRAINT `chk_payments_exoneracion_observada`
--   CHECK (`receivedPaymentMethod` <> 'Exoneracion' OR `comments` IS NOT NULL);

-- ----------------------------------------------------------------------------
-- 4. CONTROL DE CIERRE: debe coincidir con 0.6.
-- ----------------------------------------------------------------------------

SELECT 'despues' AS momento,
       COUNT(*) AS pagos,
       ROUND(SUM(`paidAmount`), 2) AS pagado,
       ROUND(SUM(`returnedAmount`), 2) AS devuelto
  FROM `payments`;

SELECT 'invoices.con_auditoria' AS control, COUNT(*) AS facturas
  FROM `invoices`
 WHERE `issuedBy` IS NOT NULL OR `cancelledAt` IS NOT NULL;
