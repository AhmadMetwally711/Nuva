import { CONTACT, RETURN_WINDOW_DAYS } from "../config";

const DAY_MS = 24 * 60 * 60 * 1000;

const formatDay = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Africa/Cairo",
  });

function ReturnPolicyNote({ deliveredAt }) {
  let deadlineText = null;

  if (deliveredAt) {
    const deadline = new Date(
      new Date(deliveredAt).getTime() + RETURN_WINDOW_DAYS * DAY_MS,
    );
    deadlineText =
      deadline > new Date()
        ? `You can contact us until ${formatDay(deadline)}.`
        : `The ${RETURN_WINDOW_DAYS}-day window ended on ${formatDay(deadline)}.`;
  }

  return (
    <p className="policy-note">
      Problem with your order? Contact us within {RETURN_WINDOW_DAYS} days of
      receiving it:{" "}
      <a href={CONTACT.whatsappUrl} target="_blank" rel="noreferrer">
        WhatsApp
      </a>{" "}
      · {CONTACT.phoneDisplay}.{deadlineText && <> {deadlineText}</>}
    </p>
  );
}

export default ReturnPolicyNote;
