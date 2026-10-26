import { Link, useParams } from "react-router-dom";

function OrderSuccess() {
  const { id } = useParams();

  return (
    <section className="order-success">
      <h1 className="shop-title">Thank you!</h1>
      <p>
        Your order <strong>#{id}</strong> has been placed. We'll call you to
        confirm delivery.
      </p>
      <Link to="/shop" className="back-link">
        Continue shopping →
      </Link>
      <Link to="/orders" className="back-link">
        View my orders →
      </Link>
    </section>
  );
}

export default OrderSuccess;
