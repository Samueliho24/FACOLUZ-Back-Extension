export function verifyPermission(rawUserPermissions: bigint, permission: number): boolean{
    const userPermissions = getBinaryString(rawUserPermissions)
    if(userPermissions[permission] === '1'){
        return true
    }else{
        return false
    }
}

export function getBinaryString(integer: bigint): string{
    let binario = ""
    try{
        binario = integer.toString(2).split('').reverse().join("");
    }catch(err){
        console.log(err)
    }
    return binario;
}

export function getPermissionsNumber(binary: string): number{
    let permissionNumber: number = 0;
    try{
        permissionNumber = Number(binary.split("").reverse().join(""))
    }catch(err){
        console.log(err)
    }
    return permissionNumber
}

export const permissionsList = {
    listarFacturas: 0,
    generarFactura: 1,
    anularFactura: 2,
    abonarFactura: 3,
    listarCertificados: 4,
    reimprimirCertificado: 5,
    emitirCertificado: 6,
    listarNotas: 7,
    subirNotas: 8,
    manejarModificacionNotas: 9,
    listarInscripcion: 10,
    inscribir: 11,
    retirarInscripcion: 12,
    listarPeriodos: 13,
    agregarPeriodo: 14,
    editarPeriodo: 15,
    cerrarPeriodo: 16,
    listarEstudiantes: 17,
    agregarEstudiante: 18,
    subirDocumentoEstudiante: 19,
    descargarDocumentoEstudiante: 20,
    imprimirCarnetEstudiante: 21,
    actualizarFotoEstudiante: 22,
    desactivarEstudiante: 23,
    listarProfesores: 24,
    agregarProfesor: 25,
    desactivarProfesor: 26,
    listarUsuarios: 27,
    agregarUsuario: 28,
    desactivarUsuario: 29,
    modificarPermisosUsuario: 30,
    listarLogs: 31,
    listarConfiguracion: 32,
    modificarPrecios: 33,
    listarCursos: 34,
    crearCurso: 35,
    editarCurso: 36,
    listarModulos: 37,
    crearModulo: 38,
    editarModulo: 39,
    desactivarModulo: 40,
    emitirReportes: 41,
    listarSecciones: 42,
    abrirSeccion: 43,
    cerrarSeccion: 44
}