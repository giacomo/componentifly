import { Component, ComponentDecorator, SlotProperty } from "../../lib";

@ComponentDecorator({ templatePath: './chat.html', stylePath: './chat.scss', selector: 'ao-chat' })
export class Chat extends Component {
    @SlotProperty header;
    @SlotProperty message;
    @SlotProperty avatar;
    @SlotProperty timestamp;
}
