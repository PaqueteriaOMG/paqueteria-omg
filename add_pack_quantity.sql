USE paqueteria_app;

ALTER TABLE Packages
ADD COLUMN pack_quantity INT DEFAULT 1 AFTER pack_estimated_delivery_date;