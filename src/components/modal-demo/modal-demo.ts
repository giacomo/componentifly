import {
  Component,
  ComponentDecorator,
  Expose,
  StateProperty,
} from "../../lib";
import { Modal } from "../modal/modal";

@ComponentDecorator({
  templatePath: "./modal-demo.html",
  stylePath: "./modal-demo.scss",
  selector: "ao-modal-demo",
})
export class ModalDemo extends Component {
  @StateProperty submittedName: string = 'Paul';


  @Expose
  openForm() {
    this.openTestcase({
      title: "Form in modal",
      message: "Please enter your name",
      name: this.submittedName
    });
  }

  private async openTestcase(data: any): Promise<void> {
    const modal = this.createComponent(Modal, data);
    const result = await modal.attach();

    if (result && result.action === "confirm") {
      const name = result.data && result.data.name ? String(result.data.name) : "";
      this.submittedName = name;
    }
  }
}
