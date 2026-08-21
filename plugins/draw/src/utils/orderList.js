// Shared back-to-front feature-id order list, used by both adapters so move semantics can't drift.

const pushIfNew = (order, id) => {
  if (!order.includes(id)) {
    order.push(id)
  }
}

const removeFromOrder = (order, id) => {
  const index = order.indexOf(id)
  if (index !== -1) {
    order.splice(index, 1)
  }
}

const moveToFront = (order, id) => {
  removeFromOrder(order, id)
  order.push(id)
}

const moveToBack = (order, id) => {
  removeFromOrder(order, id)
  order.unshift(id)
}

// No-op at the front — nothing to swap with.
const moveForward = (order, id) => {
  const index = order.indexOf(id)
  if (index === -1 || index === order.length - 1) {
    return
  }
  [order[index], order[index + 1]] = [order[index + 1], order[index]]
}

// No-op at the back — nothing to swap with.
const moveBackward = (order, id) => {
  const index = order.indexOf(id)
  if (index <= 0) {
    return
  }
  [order[index], order[index - 1]] = [order[index - 1], order[index]]
}

export {
  pushIfNew,
  removeFromOrder,
  moveToFront,
  moveToBack,
  moveForward,
  moveBackward
}
