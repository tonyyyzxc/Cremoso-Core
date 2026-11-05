import mongoose from "mongoose";

export function validateObjectId(param = "id", message = "Invalid ID.") {
  return (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[param])) {
      return res.status(400).json({ error: message });
    }
    next();
  };
}
