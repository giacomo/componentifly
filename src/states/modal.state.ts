import { StateType } from "../lib/state-type";

export interface ModalState extends StateType {
    isOpen: boolean,
    data: any,
    title?: string,
    message?: string,
    footerType?: 'default' | 'confirm-only' | 'none' | 'custom',
    name?: string,
    showForm?: boolean
}


