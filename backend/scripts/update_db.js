const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'backend', 'database.db');
const db = new sqlite3.Database(dbPath);

const newRegisters = [
    { field_name: 'Point1Capture', register_type: 'holding', function_code: 3, address: 441, data_type: 'FLOAT32', scale: 1.0, unit: '' },
    { field_name: 'Point2Capture', register_type: 'holding', function_code: 3, address: 457, data_type: 'FLOAT32', scale: 1.0, unit: '' },
    { field_name: 'Point3Capture', register_type: 'holding', function_code: 3, address: 473, data_type: 'FLOAT32', scale: 1.0, unit: '' },
    { field_name: 'LiveEncounterCount', register_type: 'holding', function_code: 3, address: 409, data_type: 'FLOAT32', scale: 1.0, unit: '' },
];

db.serialize(() => {
    // Find the twinstop device
    db.get("SELECT id FROM modbus_devices WHERE device_type = 'twinstop'", (err, device) => {
        if (err) {
            console.error("Error finding device:", err.message);
            return;
        }
        if (!device) {
            console.log("No 'twinstop' device found in database.");
            return;
        }

        console.log(`Adding registers to twinstop device (ID: ${device.id})...`);
        
        const stmt = db.prepare(`
            INSERT INTO modbus_registers 
            (device_id, field_name, register_type, function_code, address, data_type, scale, unit, byte_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ABCD')
        `);

        newRegisters.forEach(reg => {
            db.get("SELECT id FROM modbus_registers WHERE device_id = ? AND field_name = ?", [device.id, reg.field_name], (err, row) => {
                if (row) {
                    console.log(`  - ${reg.field_name} already exists. Skipping.`);
                } else {
                    stmt.run(device.id, reg.field_name, reg.register_type, reg.function_code, reg.address, reg.data_type, reg.scale, reg.unit);
                    console.log(`  - Added ${reg.field_name} at address ${reg.address}`);
                }
            });
        });

        stmt.finalize();
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Database connection closed.');
});
