import { Component, ComponentDecorator } from "../../lib";
import { SimpleformState } from "../../states/simpleform.state";

@ComponentDecorator({ templatePath: './simpleform.html', stylePath: './simpleform.scss', selector: 'ao-simpleform' })
export class Simpleform extends Component {
    state: SimpleformState = {
        name: 'Bob',
    };

    // template & styles provided by decorator

    // No methods to expose for this component
}