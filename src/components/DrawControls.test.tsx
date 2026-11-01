import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DrawControls } from "./DrawControls";

describe("DrawControls", () => {
  it("disables the draw button while drawing", () => {
    render(
      <DrawControls
        phase="drawing"
        canCopy={false}
        onDraw={vi.fn()}
        onCopy={vi.fn()}
        copyMessage=""
      />,
    );

    expect(screen.getByTestId("start-draw")).toBeDisabled();
    expect(screen.getByTestId("start-draw")).toHaveTextContent("摇号中");
  });

  it("calls draw and copy actions with keyboard-accessible buttons", async () => {
    const user = userEvent.setup();
    const onDraw = vi.fn();
    const onCopy = vi.fn();
    render(
      <DrawControls
        phase="complete"
        canCopy
        onDraw={onDraw}
        onCopy={onCopy}
        copyMessage="号码已复制"
      />,
    );

    await user.click(screen.getByTestId("start-draw"));
    await user.click(screen.getByRole("button", { name: "复制号码" }));

    expect(onDraw).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(screen.getByText("号码已复制")).toBeInTheDocument();
  });
});
