export function isExpired(expDate: Date): boolean{
    const currentTime = Math.floor(Date.now() / 1000)
    // Si hay problemas con las fechas quitar metodo de getMilisecods, lo pude por tipado de TS
    if(currentTime > expDate){
        return true
    }else{
        return false
    }
}