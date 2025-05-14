const express = require('express');
const router = express.Router();
const statesController = require('../../controllers/statesController');



router.route('/:state/funfact')
  .get(statesController.getRandomFunfact);

router.route('/:state/funfact')
  .delete(statesController.deleteFunfactFromState);

router.route('/:state/funfact')
  .patch(statesController.patchFunfact);

router.route('/funfact')
  .post(statesController.postStateFunfact);

router.route('/:state/funfact')
  .post(statesController.addFunfactToState);

router.route('/:state/funfact')
    .get(statesController.getStateCapitalByParam);

router.route('/:state/nickname')
    .get(statesController.getStateNicknameByParam);

router.route('/:state/population')
    .get(statesController.getStatePopulationByParam);

router.route('/:state/capital')
    .get(statesController.getStateCapitalByParam);

router.route('/:state/admission')
    .get(statesController.getStateAdmissionByParam);

router.route('/:state')
    .get(statesController.getStateByParam);

router.route('/')
    .get(statesController.getAllStates)
    .post(statesController.createNewState)
    .put(statesController.updateState)
    .delete(statesController.deleteState);

router.route('/:admission_number')
    .get(statesController.getState);


module.exports = router;