export async function getDolarPrice(){
    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
    const dolarRaw = res;
    const dolar = await dolarRaw.json()
    return dolar.promedio
}