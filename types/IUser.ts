export interface IUser{
    id: string,
    name: string,
    lastname: string,
    passwordSHA256?: string,
    type: number,
    active: boolean
}