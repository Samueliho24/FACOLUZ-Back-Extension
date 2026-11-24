export interface ITokenPayload{
    id: string,
    name: string,
    type: number,
    exp: Date,
    permissions: bigint | string
}