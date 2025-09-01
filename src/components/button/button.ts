import { Component, ComponentDecorator, SlotProperty } from "../../lib";

@ComponentDecorator({ templatePath: './button.html', stylePath: './button.scss', selector: 'ao-button' })
export class Button extends Component {
    @SlotProperty name = 'Button';
}
