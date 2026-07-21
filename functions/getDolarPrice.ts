export async function getDolarPrice(){

    let dolarPrice

    fetch('https://ve.dolarapi.com/v1/euros/oficial')
    .then(async data => {
        const dolarRaw = data;
        const dolar = await dolarRaw.json()
        dolarPrice = dolar.promedio
    })

    return dolarPrice
}