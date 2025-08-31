import { Component, ComponentDecorator, StateProperty } from "../../lib";

@ComponentDecorator({ templatePath: './simpleform.html', stylePath: './simpleform.scss', selector: 'ao-simpleform' })
export class Simpleform extends Component {
    @StateProperty name: string = 'Bob';

    // template & styles provided by decorator

    // No methods to expose for this component
}