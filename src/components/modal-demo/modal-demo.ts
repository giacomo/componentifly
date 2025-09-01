import { data } from "cheerio/lib/api/attributes";
import {
  Component,
  ComponentDecorator,
  Expose,
  StateProperty,
} from "../../lib";

@ComponentDecorator({
  templatePath: "./modal-demo.html",
  stylePath: "./modal-demo.scss",
  selector: "ao-modal-demo",
})
export class ModalDemo extends Component {
  @StateProperty submittedName: string = 'Paul';

  @Expose openSimple() {
    this.openTestcase({ title: "Simple", message: "A simple modal message." });
  }
  @Expose openWithTitle() {
    this.openTestcase({
      title: "Titled Modal",
      message: "Modal with a custom title.",
    });
  }
  @Expose openConfirmOnly() {
    this.openTestcase({
      title: "Confirm Only",
      message: "Only a confirm button is shown.",
      footerType: "confirm-only",
    });
  }
  @Expose openNoFooter() {
    this.openTestcase({
      title: "No Footer",
      message: "This modal has no footer.",
      footerType: "none",
    });
  }
  @Expose openLargeContent() {
    this.openTestcase({
      title: "Large Content",
      message: new Array(100).fill("Long content line.").join("\n"),
    });
  }
  @Expose openForm() {
    this.openTestcase({
      title: "Form in modal",
      message: "Please enter your name",
      footerType: "default",
      showForm: true,
      data: {
        name: this.submittedName
      }
    });
  }

  private async openTestcase(data: any): Promise<void> {
    const modal = this.getComponent<any>("demoModal");
    // Check if modal is open
    if (modal && !modal.isOpen) {
      // add styling to modal
      modal.style.display = "block";
    }

    if (!modal) return;
    if (typeof modal.open === "function") {
      const result = await modal.open(data);
      if (result && result.action === "confirm") {
        const name =
          result.data && result.data.name ? String(result.data.name) : "";
        
        // Update the state property
        if (!this.state || typeof this.state !== 'object') this.state = {};
        this.submittedName = name;
      }

      modal.style.display = "none";
    }
  }

  public onInit(): void {}
}
