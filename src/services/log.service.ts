export class LogService {
    constructor(public adapter: any) {
    }

    public debug(message: string) {
        this.log('debug', message);
    }

    public log(level: string, message: string) {
        console.log({level, message});
    }
}