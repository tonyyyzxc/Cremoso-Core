import Order from "../models/order.js";
import Sale from "../models/sale.js";
import ShiftReconciliation from "../models/shiftReconciliation.js";

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

function getManilaDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getManilaDayRange(dateKey) {
  const start = new Date(`${dateKey}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

async function getCurrentCashSales(branchId, businessDate, range) {
  const [orderResults, saleResults] = await Promise.all([
    Order.aggregate([
      {
        $match: {
          branchId,
          status: "completed",
          paymentMethod: "Cash",
          updatedAt: { $gte: range.start, $lt: range.end },
        },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Sale.aggregate([
      { $match: { branchId, businessDate, paymentMethod: "Cash" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);
  return roundMoney((orderResults[0]?.total || 0) + (saleResults[0]?.total || 0));
}

export async function getShiftReconciliation(req, res) {
  if (!req.user.branchId) {
    return res.status(400).json({ error: "This account is not assigned to a branch." });
  }
  const businessDate = getManilaDateKey();
  const range = getManilaDayRange(businessDate);

  try {
    const [cashSales, reconciliation] = await Promise.all([
      getCurrentCashSales(req.user.branchId, businessDate, range),
      ShiftReconciliation.findOne({ branchId: req.user.branchId, businessDate })
        .populate("submittedBy", "name email"),
    ]);
    return res.json({ businessDate, cashSales, reconciliation });
  } catch (error) {
    console.error("Shift reconciliation lookup error:", error);
    return res.status(500).json({ error: "Unable to load shift reconciliation." });
  }
}

export async function submitShiftReconciliation(req, res) {
  if (!req.user.branchId) {
    return res.status(400).json({ error: "This account is not assigned to a branch." });
  }
  const openingFloat = Number(req.body.openingFloat);
  const countedCash = Number(req.body.countedCash);
  if (!Number.isFinite(openingFloat) || openingFloat < 0 || !Number.isFinite(countedCash) || countedCash < 0) {
    return res.status(400).json({ error: "Enter valid non-negative opening and counted cash amounts." });
  }

  const businessDate = getManilaDateKey();
  const range = getManilaDayRange(businessDate);
  try {
    const cashSales = await getCurrentCashSales(req.user.branchId, businessDate, range);
    const expectedCash = roundMoney(openingFloat + cashSales);
    const reconciliation = await ShiftReconciliation.create({
      branchId: req.user.branchId,
      businessDate,
      openingFloat: roundMoney(openingFloat),
      cashSales,
      expectedCash,
      countedCash: roundMoney(countedCash),
      variance: roundMoney(countedCash - expectedCash),
      submittedBy: req.user._id,
    });
    await reconciliation.populate("submittedBy", "name email");
    return res.status(201).json({ businessDate, cashSales, reconciliation });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "This branch already submitted a reconciliation for today." });
    }
    console.error("Shift reconciliation submission error:", error);
    return res.status(400).json({ error: "Unable to submit shift reconciliation." });
  }
}
