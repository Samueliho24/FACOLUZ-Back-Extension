export interface IFilterUsers{
    id: string | null,
    identification: number | null,
    name: string | null
}

//Si el id existe y el resto de parametros es null
//Se devuelve el resultado exacto

//Si alguno de los demas parametros existe se filtra de acuerdo a estos
//y se devuelve la lista