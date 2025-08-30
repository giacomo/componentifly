import { Component, ComponentDecorator } from "../../lib";

@ComponentDecorator({ templatePath: './button.html', stylePath: './button.scss', selector: 'ao-button' })
export class Button extends Component {
    state = {};
    inputAttributes = ['name'];

    // template & styles provided by decorator

    // No exposed methods needed for this presentational component
}
