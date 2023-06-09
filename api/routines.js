const express = require('express');
const router = express.Router();
const { requireUser } = require("./utilities");
const { 
  getRoutineById,
  getRoutinesWithoutActivities,
  getAllRoutines,
  getAllPublicRoutines,
  getAllRoutinesByUser,
  getPublicRoutinesByUser,
  getPublicRoutinesByActivity,
  createRoutine,
  updateRoutine,
  destroyRoutine, 
  addActivityToRoutine,
  getRoutineActivityById,
  getRoutineActivitiesByRoutine
} = require('../db');
const usersRouter = require('./users');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "neverTell"

// GET /api/routines

router.get("/", async (req, res) => {
    const allRoutines = await getAllPublicRoutines();
    res.send(allRoutines)
})

// POST /api/routines*

router.post('/', async (req, res, next) => {
    if (!req.user) {
        console.log("trex")
        res.status(401)
        res.send({
            error: "trex",
          name: "MissingUserError",
          message: "You must be logged in to perform this action"
        });
        next()
      } else {

    console.log("req.user11", req.user)
    const { isPublic, name, goal } = req.body;
   
    const creatorId = req.user.id //we want to grab userId to verify user is logged in
    // only send the tags if there are some to send
    try {
        
        if (!req.user.id) {
            res.send({error:"something", message:'You must be logged in to perform this action', name:"something"})
            }
        const newRoutine = await createRoutine({creatorId, isPublic, name, goal});
        if (newRoutine) {
            
            console.log("newRoutine1", newRoutine)
            res.send (newRoutine)
        console.log("newRoutine", newRoutine)
  } else {
      res.send({
          name: "Create routines error",
          message: "Error with creating new routine-missing input"
      })
  }
      
    } catch (error) {
      next({error:"something", message:'You must be logged in to perform this action', name:"something"});
    }
}
  });

// PATCH /api/routines/:routineId

router.patch('/:routineId', requireUser, async (req, res, next) => {
  const { routineId } = req.params;
  const { isPublic, name, goal } = req.body;
 const authHeader = req.headers.authorization

  try {
    const routine = await getRoutineById(routineId);
    console.log("routine6", routine)
    const token = authHeader.split(" ")[1]
    const loggedInUser = jwt.verify(token, JWT_SECRET)
    if (routine.creatorId !== loggedInUser.id) {
      return res.status(403).send({
        error: 'sdfgsdg',
        message: `User ${loggedInUser.username} is not allowed to update ${routine.name}`,
        name: 'dfgdsfg',
      });
    }
    const updatedRoutine = await updateRoutine({
      id: routineId,
      isPublic,
      name,
      goal
    });
    res.send(updatedRoutine);
  } catch (error) {
    next(error);
  }
});


// DELETE /api/routines/:routineId
router.delete('/:routineId', requireUser, async (req, res, next ) => {
    const authHeader = req.headers.authorization;
    const id = req.params.routineId;
    try {
        const token = authHeader.split(" ")[1];
        //const currentUser = req.params.username; this was undefined 
        const currentUser = jwt.verify(token, process.env.JWT_SECRET);
        const username = currentUser.username;
        // const routine = await destroyRoutine(id);
       //if statement that compares current user with creatorId - if !user = creatorId 
       const routine = await getRoutineById(id);
      //  console.log("this is my routine creator id", routine.creatorId)
      //  console.log("this is my currentUser", currentUser) this will help explain how we changed ln 114 to currentUser.id (remember apple vs. fruit basket analogy)
       if (routine.creatorId !== currentUser.id) {
        res.status(403).send ({
            error: "Not allowed to delete routine",
            message:`User ${username} is not allowed to delete ${routine.name}`,
            name: "Unauthorized user"
        })
       } else {
        await destroyRoutine(routine.id)
        res.send(routine)
       }
    } catch ({ name, message}) {
        next({name, message});
    }
})
// POST /api/routines/:routineId/activities

router.post('/:routineId/activities', async (req, res, next ) => {
  const { activityId, count, duration } = req.body;
  const { routineId } = req.params;
  try { 

    const checkRoutine = await getRoutineById(routineId) 
     console.log("checkRoutine3", checkRoutine)
    
    const routineActivities = await getRoutineActivitiesByRoutine({ id: routineId });
    console.log("routineActivities", routineActivities);

    const duplicateActivity = routineActivities.find(activity => activity.activityId === activityId);
    console.log("duplicateActivity", duplicateActivity);

    if (duplicateActivity && checkRoutine) {
      res.send({
				error: "DuplicateError",
				message: `Activity ID ${activityId} already exists in Routine ID ${routineId}`,
				name: "CannotAddDuplicateActivity",
			});
    } else{

    const addedActivity = await addActivityToRoutine({routineId, activityId, count, duration});
    res.send(addedActivity)

    }
  } catch (error) {
    next (error)
  }
})

module.exports = router;
