const pool = require("../db");

exports.register = async (req, res) => {
  try {
    //1. Destructure the req.body (name, email , password)
    const {
      Name,
      Age,
      Sex,
      email,
      Smoker,
      CigsPerDay,
      PrevalentStroke,
      Diabetes,
    } = req.body;

    //2. Check if user exists (if user exist then throw error)
    const user = await pool.query("select * from patient where email = $1", [
      email,
    ]);

    if (user.rowCount !== 0) {
      return res.status(405).send("User Already exists");
    }

    //3. Enter the new user into the DB
    const patient = await pool.query(
      "Insert into patient(name , email,age,sex,smoker,cigsperday,prevalentstroke,diabetes) values($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
      [Name, email, Age, Sex, Smoker, CigsPerDay, PrevalentStroke, Diabetes]
    );

    const patient_id = patient.rows[0].id;

    res.status(201).json({
      message: "Successfully Registered Patient",
      patient_id: patient_id,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};

exports.getPatientByID = async (req, res) => {
  try {
    //1. Destructure the req.body (name, email , password)
    const { email } = req.body;

    //2. Check if user exists
    const user = await pool.query("select * from patient where email = $1", [
      email,
    ]);

    if (user.rowCount == 0) {
      return res.status(404).send("User Does not exist");
    }

    res.status(200).json(user.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server Error");
  }
};
