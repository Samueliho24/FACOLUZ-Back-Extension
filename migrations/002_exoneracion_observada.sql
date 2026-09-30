-- ===========================================================================
--  002 - Cobro: corregir el techo de devolucion y exigir la exoneracion
--  justificada
-- ===========================================================================
--
--  SOLO PARA UNA BASE QUE YA TIENE DATOS. Si la base se esta creando desde
--  cero, usa `Docs/FACOLUZ-Docs/DB-Extension.sql`, que ya trae estas dos
--  definiciones corregidas.
--
--  Es de una sola vez: MariaDB no tiene `DROP CONSTRAINT IF EXISTS` ni
--  `ADD CONSTRAINT IF NOT EXISTS`. Si la corres dos veces falla en el DROP.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  1. `chk_payments_returned_le_paid` estaba MAL PLANTEADO
-- ---------------------------------------------------------------------------
--
--  Era:  CHECK (returnedAmount IS NULL OR returnedAmount <= paidAmount)
--
--  El techo de "no devuelvas mas de lo que pagaste" tiene sentido DENTRO de un
--  movimiento: alguien paga $20 y se le devuelven $5, eso esta bien; que se le
--  devuelvan $25, no.
--
--  Pero la anulacion escribe un movimiento que NO es un pago: es una salida de
--  dinero, con `paidAmount = 0` y `returnedAmount = <lo que se devuelve>`. Contra
--  el CHECK original eso es `10 <= 0`, y la fila no entra.
--
--  O sea: anular una factura con dinero cobrado fallaba SIEMPRE, con
--  `ERROR 4025 CONSTRAINT chk_payments_returned_le_paid failed`, que la ruta
--  reportaba como un 500 sin explicar nada. Este CHECK lo introdujo la
--  migracion 001 y no se probo con una factura pagada.
--
--  La regla correcta: si el movimiento tiene entrada de dinero, la devolucion no
--  puede pasar esa entrada. Si no tiene entrada, no hay contra que compararla, y
--  el movimiento es una devolucion pura.
--
--  El techo REAL --no devolver mas de lo cobrado en toda la factura-- no lo
--  puede hacer un CHECK por fila, porque spans varias filas. Lo impone
--  `makePayment` sumando con la factura en `FOR UPDATE` (T4). Este CHECK solo
--  cuida la coherencia de cada fila aislada.
-- ---------------------------------------------------------------------------
ALTER TABLE `payments`
  DROP CONSTRAINT `chk_payments_returned_le_paid`;

ALTER TABLE `payments`
  ADD CONSTRAINT `chk_payments_returned_le_paid` CHECK (
    `paidAmount` = 0
    OR `returnedAmount` IS NULL
    OR `returnedAmount` <= `paidAmount`
  );

-- ---------------------------------------------------------------------------
--  2. `chk_payments_exoneracion_observada`: se activa (T8)
-- ---------------------------------------------------------------------------
--
--  La 001 lo dejo comentado a proposito: la base lo rechazaba, pero el backend
--  todavia aceptaba una exoneracion sin justificacion, y activar un CHECK antes
--  de que la aplicacion lo pidiera es un 500 crudo cada vez que alguien exonera.
--
--  Ahora `POST /api/payments` rechaza la exoneracion sin observacion de al menos
--  10 caracteres (`main.ts`), y el modal de cobro la exige antes de enviarla.
--  Backend y base piden lo mismo, asi que el CHECK se puede activar: es la
--  ultima linea de defensa, para lo que llegue por SQL.
--
--  Ojo: `receivedPaymentMethod` es NULL en las filas de devolucion por
--  anulacion. `NULL <> 'Exoneracion'` es NULL, y un CHECK que da NULL se
--  considera fulfilled, asi que la devolucion no choca con este CHECK.
-- ---------------------------------------------------------------------------
ALTER TABLE `payments`
  ADD CONSTRAINT `chk_payments_exoneracion_observada` CHECK (
    `receivedPaymentMethod` <> 'Exoneracion' OR `comments` IS NOT NULL
  );

-- ---------------------------------------------------------------------------
--  Comprobacion
-- ---------------------------------------------------------------------------
SELECT '002 aplicada. Constraints de payments:' AS estado;
SELECT `CONSTRAINT_NAME`
FROM `information_schema`.`TABLE_CONSTRAINTS`
WHERE `CONSTRAINT_SCHEMA` = DATABASE()
  AND `TABLE_NAME` = 'payments'
  AND `CONSTRAINT_TYPE` = 'CHECK'
ORDER BY `CONSTRAINT_NAME`;