import { Component, ComponentDecorator, StateProperty } from "../../lib";

@ComponentDecorator({ templatePath: './simpleform.html', stylePath: './simpleform.scss', selector: 'ao-simpleform' })
export class Simpleform extends Component {
    @StateProperty name: string = 'Bob';

}