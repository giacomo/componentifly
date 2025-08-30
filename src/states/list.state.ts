import { StateType } from "../lib/state-type";

export interface ListState extends StateType {
    items: string[],
    objItems: { id: number, name: string }[]
}