-- Prevent negative currentStock on Item
CREATE OR REPLACE FUNCTION prevent_negative_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."currentStock" < 0 THEN
    RAISE EXCEPTION 'Stock level cannot be negative. Attempted value: %', NEW."currentStock";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_negative_stock ON "Item";
CREATE TRIGGER check_negative_stock
BEFORE INSERT OR UPDATE ON "Item"
FOR EACH ROW
EXECUTE FUNCTION prevent_negative_stock();
