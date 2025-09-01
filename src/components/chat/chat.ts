import { Component, ComponentDecorator, SlotProperty, StateProperty, InputProperty, Expose } from "../../lib";

@ComponentDecorator({ templatePath: './chat.html', stylePath: './chat.scss', selector: 'ao-chat' })
export class Chat extends Component {
    @SlotProperty header;
    @SlotProperty message;
    @SlotProperty avatar;
    @SlotProperty timestamp;

    @InputProperty name: number = 0;

    @Expose
    incrementName() {
        this.name++;
    }
}
