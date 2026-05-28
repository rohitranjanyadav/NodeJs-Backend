function makeTea(typeOfTea) {
  return `Making ${typeOfTea}`;
}
const teaOrder = makeTea("green tea");
console.log(teaOrder);

function orderTea(teaType) {
  function confirmOrder() {
    return `Order confirmed for ${teaType}`;
  }
  return confirmOrder();
}
const orderConfirmation = orderTea("Lemon Tea");
console.log(orderConfirmation);

// ? Arrow Function
const calculateTotal = (price, quantity) => {
  return price * quantity;
};
const totalCost = calculateTotal(1200, 10);
console.log(totalCost);

