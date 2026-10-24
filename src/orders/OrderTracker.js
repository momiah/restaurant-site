import React from "react";
import styled from "styled-components";
import { describeOrder, stepLabels } from "./orderStatus";

// Live progress for one order: a headline for the current step plus the four-step
// track (received -> preparing -> ready/out for delivery -> done).
const OrderTracker = ({ order }) => {
  const { index, title, detail } = describeOrder(order);
  const steps = stepLabels(order);

  return (
    <Tracker aria-live="polite">
      <Headline data-testid="order-status">{title}</Headline>
      <Detail>{detail}</Detail>
      <Steps>
        {steps.map(({ step, label }, i) => (
          <Step key={step} $done={i <= index} $current={i === index}>
            <Dot $done={i <= index}>{i < index || index === steps.length - 1 ? "✓" : i + 1}</Dot>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Steps>
    </Tracker>
  );
};

const accent = ({ theme }) => theme?.colors?.primary || "#FF8C00";

const Tracker = styled.section({
  width: "100%",
  textAlign: "center",
});

const Headline = styled.h2({
  margin: "8px 0 4px",
  fontSize: "1.6rem",
});

const Detail = styled.p({
  margin: "0 0 20px",
  fontSize: "1rem",
  color: "#555",
});

const Steps = styled.ol({
  listStyle: "none",
  display: "flex",
  justifyContent: "space-between",
  padding: 0,
  margin: 0,
  gap: 8,
});

const Step = styled.li((props) => ({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 6,
  fontWeight: props.$current ? 700 : 400,
  opacity: props.$done ? 1 : 0.45,
}));

const Dot = styled.span((props) => ({
  width: 32,
  height: 32,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.9rem",
  color: props.$done ? "#fff" : "#333",
  backgroundColor: props.$done ? accent(props) : "#E4E4E4",
}));

const StepLabel = styled.span({
  fontSize: "0.8rem",
  lineHeight: 1.2,
});

export default OrderTracker;
