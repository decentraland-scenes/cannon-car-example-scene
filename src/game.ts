/*
  IMPORTANT: The tsconfig.json has been configured to include "node_modules/cannon/build/cannon.js"
  Code is adapted from: https://github.com/schteppe/cannon.js/blob/master/demos/raycastVehicle.html
*/

/// >>>>>>>>>> TODO: Reorient the car and wheels <<<<<<<<<<
/// >>>>>>>>>> TODO: Needs refactoring <<<<<<<<<<
/// >>>>>>>>>> TODO: Switch to cannon-es.js <<<<<<<<<<

// Create base scene
const baseScene: Entity = new Entity()
baseScene.addComponent(new GLTFShape("models/baseScene.glb"))
baseScene.addComponent(
  new Transform({
    scale: new Vector3(2.5, 0.05, 2.5),
  })
)
engine.addEntity(baseScene)

const boxes: Entity[] = [] // Store boxes
const boxBodies: CANNON.Body[] = [] // Store box bodies
let boxStartPosition: number = 34 // Start position for the boxes
let boxHeightPosition: number = 2

const blueMaterial: Material = new Material()
blueMaterial.roughness = 0.5
blueMaterial.albedoColor = Color3.FromInts(21, 105, 195)

const blackMaterial: Material = new Material()
blackMaterial.roughness = 0.5
blackMaterial.albedoColor = Color3.FromInts(35, 35, 35)

// Create wall of boxes
for (let i = 0; i < 3; i++) {
  for (let j = 0; j < 6; j++) {
    let positionX: number = boxStartPosition
    let positionY: number = boxHeightPosition
    let positionZ: number = 38

    const box: Entity = new Entity()
    engine.addEntity(box)
    box.addComponent(new BoxShape())
    box.addComponent(
      new Transform({
        position: new Vector3(positionX, positionY, positionZ),
        scale: new Vector3(2, 2, 2),
      })
    )
    if (i % 2 == 0) {
      if (j % 2 == 0) {
        box.addComponent(blueMaterial)
      } else {
        box.addComponent(blackMaterial)
      }
    } else {
      if (j % 2 == 0) {
        box.addComponent(blackMaterial)
      } else {
        box.addComponent(blueMaterial)
      }
    }
    boxes.push(box)
    boxStartPosition += 2
  }
  boxStartPosition = 34
  boxHeightPosition += 2 // To ensure the colliders aren't intersecting when the simulation starts
}

// Car entities
const chassis: Entity = new Entity()
chassis.addComponent(new GLTFShape("models/carBody.glb"))
chassis.addComponent(new Transform())
engine.addEntity(chassis)

const wheels: Entity[] = []
const wheelPositions: Vector3[] = [new Vector3(2, 1.5, 0), new Vector3(2, -1.5, 0), new Vector3(-2.1, 1.5, 0), new Vector3(-2.1, -1.5, 0)]

for (let i = 0; i < wheelPositions.length; i++) {
  const wheel: Entity = new Entity()
  if (i % 2 == 0) {
    wheel.addComponent(new GLTFShape("models/carWheelRight.glb"))
  } else {
    wheel.addComponent(new GLTFShape("models/carWheelLeft.glb"))
  }

  wheel.addComponent(new Transform({ position: wheelPositions[i] }))
  engine.addEntity(wheel)
  wheels.push(wheel)
}

// Setup our world
const world: CANNON.World = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world)
world.gravity.set(0, -9.82, 0) // m/s²
world.defaultContactMaterial.friction = 0

const groundMaterial: CANNON.Material = new CANNON.Material("groundMaterial")
const wheelMaterial: CANNON.Material = new CANNON.Material("wheelMaterial")
const wheelGroundContactMaterial: CANNON.ContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
  friction: 0.3,
  restitution: 0,
  contactEquationStiffness: 1000,
})

const boxMaterial: CANNON.Material = new CANNON.Material("boxMaterial")
const boxToGroundContactMaterial: CANNON.ContactMaterial = new CANNON.ContactMaterial(groundMaterial, boxMaterial, {
  friction: 0.4,
  restitution: 0.5,
})
const boxToBoxContactMaterial: CANNON.ContactMaterial = new CANNON.ContactMaterial(boxMaterial, boxMaterial, {
  friction: 0.5,
  restitution: 0.5,
})
world.addContactMaterial(boxToGroundContactMaterial)
world.addContactMaterial(boxToBoxContactMaterial)

// Create bodies to represent each of the box
for (let i = 0; i < boxes.length; i++) {
  let boxTransform: Transform = boxes[i].getComponent(Transform)
  const boxBody: CANNON.Body = new CANNON.Body({
    mass: 2, // kg
    position: new CANNON.Vec3(boxTransform.position.x, boxTransform.position.y, boxTransform.position.z), // m
    shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)), // m
  })

  boxBody.material = boxMaterial
  boxBody.linearDamping = 0.5
  boxBody.angularDamping = 0.5

  world.addBody(boxBody) // Add body to the world
  boxBodies.push(boxBody)
}

// We must add the contact materials to the world
world.addContactMaterial(wheelGroundContactMaterial)

// Create a ground plane and apply physics material
const groundBody: CANNON.Body = new CANNON.Body({
  mass: 0, // mass == 0 makes the body static
})
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2) // Reorient ground plane to be in the y-axis

const groundShape: CANNON.Plane = new CANNON.Plane()
groundBody.addShape(groundShape)
groundBody.material = groundMaterial
world.addBody(groundBody)

const chassisShape: CANNON.Box = new CANNON.Box(new CANNON.Vec3(7.2 / 2, 3.3 / 2, 1.7 / 2)) // Dimensions is from the center
const chassisBody: CANNON.Body = new CANNON.Body({ mass: 150 })
chassisBody.addShape(chassisShape)
chassisBody.position.set(16, 4, 16) // Start position in scene
chassisBody.angularVelocity.set(-1.5, 0.0, 1.5)

const options = {
  radius: 0.5, // m
  directionLocal: new CANNON.Vec3(0, 0, -1),
  suspensionStiffness: 30,
  suspensionRestLength: 0.4,
  frictionSlip: 5,
  dampingRelaxation: 2.3,
  dampingCompression: 4.4,
  maxSuspensionForce: 100000,
  rollInfluence: 0.01,
  axleLocal: new CANNON.Vec3(0, 1, 0),
  chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
  maxSuspensionTravel: 0.3,
  customSlidingRotationalSpeed: -30,
  useCustomSlidingRotationalSpeed: true,
}

// Create the vehicle
const vehicle: CANNON.RaycastVehicle = new CANNON.RaycastVehicle({
  chassisBody: chassisBody,
})

// Set the wheel bodies positions
for (let i = 0; i < wheelPositions.length; i++) {
  options.chassisConnectionPointLocal.set(wheelPositions[i].clone().x, wheelPositions[i].clone().y, wheelPositions[i].clone().z)
  vehicle.addWheel(options)
}
vehicle.addToWorld(world)

const wheelBodies: CANNON.Body[] = []

for (let i = 0; i < vehicle.wheelInfos.length; i++) {
  let wheel = vehicle.wheelInfos[i]
  let cylinderShape: CANNON.Cylinder = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20)
  let wheelBody: CANNON.Body = new CANNON.Body({
    mass: 0,
  })
  wheelBody.type = CANNON.Body.KINEMATIC
  wheelBody.collisionFilterGroup = 0 // turn off collisions
  let q: CANNON.Quaternion = new CANNON.Quaternion()
  q.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2)
  wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q)
  wheelBodies.push(wheelBody)
  world.addBody(wheelBody)
}

const fixedTimeStep: number = 1.0 / 60.0 // seconds
const maxSubSteps: number = 3

class updateSystem implements ISystem {
  update(dt: number): void {
    // Instruct the world to perform a single step of simulation.
    // It is generally best to keep the time step and iterations fixed.
    world.step(fixedTimeStep, dt, maxSubSteps)

    // Position and rotate the boxes in the scene to match their cannon world counterparts
    for (let i = 0; i < boxes.length; i++) {
      boxes[i].getComponent(Transform).position.copyFrom(boxBodies[i].position)
      boxes[i].getComponent(Transform).rotation.copyFrom(boxBodies[i].quaternion)
    }

    for (let i = 0; i < vehicle.wheelInfos.length; i++) {
      vehicle.updateWheelTransform(i)
      let t: CANNON.Transform = vehicle.wheelInfos[i].worldTransform
      let wheelBody: CANNON.Body = wheelBodies[i]
      wheelBody.position.copy(t.position)
      wheelBody.quaternion.copy(t.quaternion)
      wheels[i].getComponent(Transform).position.copyFrom(wheelBodies[i].position)
      wheels[i].getComponent(Transform).rotation.copyFrom(wheelBodies[i].quaternion)
    }
    chassis.getComponent(Transform).position.copyFrom(chassisBody.position)
    chassis.getComponent(Transform).rotation.copyFrom(chassisBody.quaternion)
  }
}

engine.addSystem(new updateSystem())

let forwardForce: number = 0.0
let steerValue: number = 0.0
const maxSteerValue: number = 0.5
const maxSpeed: number = 300
const brakeForce: number = 25

class updateDriveSystem implements ISystem {
  update(): void {
    // Forward force
    vehicle.applyEngineForce(forwardForce, 2)
    vehicle.applyEngineForce(forwardForce, 3)

    // Steering
    vehicle.setSteeringValue(steerValue, 0)
    vehicle.setSteeringValue(steerValue, 1)

    // Braking
    // Press E and F Keys together
    if (isEKeyPressed && isFKeyPressed) {
      vehicle.setBrake(brakeForce, 0)
      vehicle.setBrake(brakeForce, 1)
      vehicle.setBrake(brakeForce, 2)
      vehicle.setBrake(brakeForce, 3)
    } else {
      vehicle.setBrake(0, 0)
      vehicle.setBrake(0, 1)
      vehicle.setBrake(0, 2)
      vehicle.setBrake(0, 3)
    }
  }
}
engine.addSystem(new updateDriveSystem())

// Controls
const input = Input.instance

let isPointerPressed = false
let isEKeyPressed = false
let isFKeyPressed = false

// Pointer
input.subscribe("BUTTON_DOWN", ActionButton.POINTER, false, () => {
  isPointerPressed = true
})
input.subscribe("BUTTON_UP", ActionButton.POINTER, false, () => {
  isPointerPressed = false
})

// E Key
input.subscribe("BUTTON_DOWN", ActionButton.PRIMARY, false, () => {
  isEKeyPressed = true
})
input.subscribe("BUTTON_UP", ActionButton.PRIMARY, false, () => {
  isEKeyPressed = false
})

// F Key
input.subscribe("BUTTON_DOWN", ActionButton.SECONDARY, false, () => {
  isFKeyPressed = true
})
input.subscribe("BUTTON_UP", ActionButton.SECONDARY, false, () => {
  isFKeyPressed = false
})

class ButtonChecker {
  update(dt: number) {
    if (isPointerPressed) {
      // Accelerate
      if (forwardForce > -maxSpeed) forwardForce -= 300 * dt
      log(forwardForce)
    } else {
      // Decelerate
      if (forwardForce < 0) {
        forwardForce += 300 * dt
      } else {
        forwardForce = 0
      }
    }

    if (isEKeyPressed && steerValue > -maxSteerValue) {
      log(steerValue)
      steerValue -= 3 * dt
    }
    if (isFKeyPressed && steerValue < maxSteerValue) {
      steerValue += 3 * dt
    }
  }
}

engine.addSystem(new ButtonChecker())
