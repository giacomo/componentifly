import { StateType } from "../lib/state-type";

export interface ModalState extends StateType {
    isOpen: boolean,
    data: any
}