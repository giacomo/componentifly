import { StateType } from "../lib/state-type";

export interface CounterState extends StateType {
    count: number,
}