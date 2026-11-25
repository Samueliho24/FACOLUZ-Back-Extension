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
    agregarAFactura: 1,     //Tambien se usa para agregar pagos
    anularFactura: 2,
    listarCertificados: 3,
    reimprimirCertificado: 4,
    emitirCertificado: 5,
    listarNotas: 6,
    subirNotas: 7,      //Tambien se usa para solicitar modificacion
    manejarModificacionNotas: 8,        //Se usa para aprobar modificaciones solicitadas por profesores
    listarInscripcion: 9,
    administrarInscripcion: 10,         //Inscribir o retirar alumnos o similares
    listarPeriodos: 11,
    administrarPeriodos: 12,
    listarEstudiantes: 13,
    administrarEstudiantes: 14,
    listarProfesores: 15,
    administrarProfesores: 16,
    listarUsuarios: 17,
    administrarUsuarios: 18,
    listarLogs: 19,
    listarConfiguracion: 20,
    modificarPrecios: 21,
    listarCursos: 22,
    administrarCursos: 23,
    listarModulos: 24,
    administrarModulos: 24,
    emitirReportesAdministrativos: 25,
    listarSecciones: 26,
    administrarSecciones: 27
}

export const permissionsArray = [
    {label: "listarFacturas", value: 0},
    {label: "agregarAFactura", value: 1},     //Tambien se usa para agregar pagos
    {label: "anularFactura", value: 2},
    {label: "listarCertificados", value: 3},
    {label: "reimprimirCertificado", value: 4},
    {label: "emitirCertificado", value: 5},
    {label: "listarNotas", value: 6},
    {label: "subirNotas", value: 7},      //Tambien se usa para solicitar modificacion
    {label: "manejarModificacionNotas", value: 8},        //Se usa para aprobar modificaciones solicitadas por profesores
    {label: "listarInscripcion", value: 9},
    {label: "administrarInscripcion", value: 10},         //Inscribir o retirar alumnos o similares
    {label: "listarPeriodos", value: 11},
    {label: "administrarPeriodos", value: 12},
    {label: "listarEstudiantes", value: 13},
    {label: "administrarEstudiantes", value: 14},
    {label: "listarProfesores", value: 15},
    {label: "administrarProfesores", value: 16},
    {label: "listarUsuarios", value: 17},
    {label: "administrarUsuarios", value: 18},
    {label: "listarLogs", value: 19},
    {label: "listarConfiguracion", value: 20},
    {label: "modificarPrecios", value: 21},
    {label: "listarCursos", value: 22},
    {label: "administrarCursos", value: 23},
    {label: "listarModulos", value: 24},
    {label: "administrarModulos", value: 24},
    {label: "emitirReportesAdministrativos", value: 25},
    {label: "listarSecciones", value: 26},
    {label: "administrarSecciones", value: 27}
]