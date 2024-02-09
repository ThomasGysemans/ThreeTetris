import * as THREE from 'three';
import { Vector3 } from 'three';

/**
 * @typedef {THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>} ThreeJSCube The mesh of a cube
 */

/**
 * A cube to be stored in the grid.
 * It remembers its color and position.
 */
class Cube {
  /**
   * The hexadecimal code of the color.
   * @type {number}
   */
  color;

  /**
   * The mesh of the cube.
   * Use this property to edit the position.
   * @type {ThreeJSCube}
   */
  mesh;

  /**
   * Constructs a cube to be stored in the grid.
   * @param {number} color The hexadecimal code of the color.
   * @param {Vector3} position The position of the cube.
   */
  constructor(color, position) {
    this.color = color;
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const material = new THREE.MeshBasicMaterial({ color });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.x = position.x;
    cube.position.y = position.y;
    cube.position.z = position.z;
    this.mesh = cube;
  }

  /**
   * Gets the X coordinate of the cube.
   * @returns {number} The X-coordinate of the mesh.
   */
  x() {
    return this.mesh.position.x;
  }

  /**
   * Gets the Y coordinate of the cube.
   * @returns {number} The Y-coordinate of the mesh.
   */
  y() {
    return this.mesh.position.y;
  }

  /**
   * Gets the {@link Vector3} instance of the mesh.
   * @returns {Vector3}
   */
  vec3() {
    return this.mesh.position;
  }

  /**
   * Moves the cube on the X-axis.
   * @param {number} shift The shift towards right. Use negative value for a shift towards left.
   */
  moveX(shift) {
    this.mesh.position.x += shift;
  }

  /**
   * Makes the cube go down once (effectively decrements Y position by 1).
   */
  down() {
    this.mesh.position.y--;
  }

  /**
   * Gets the mesh of the cube.
   * The mesh is the thing that must be added to the scene
   * so that it can get rendered by ThreeJS.
   * @returns {ThreeJSCube} A cube to be added onto the scene.
   */
  render() {
    return this.mesh;
  }

  /**
   * Creates a deep copy of this instance so that it can be added
   * to the grid without having to worry about shallow references.
   * @returns {Cube}
   */
  copy() {
    return new Cube(this.color, this.mesh.position);
  }

  /**
   * Generates a string representation of the cube for debugging purposes.
   * @returns {string}
   */
  toString() {
    const { x, y, z } = this.mesh.position;
    return "Cube(" + (x + ";" + y + ";" + z) + ")";
  }
}

/**
 * The size of a cube.
 * @global
 */
const CUBE_SIZE = 1;

/**
 * By how many the Y position of a cube will get 
 * incremented when moving downwards.
 * @global
 */
const CUBE_SHIFT = 1;

/**
 * The delay between each movement of the falling cube.
 * @global
 */
const DELAY = 100;

/**
 * The starting Y position of a new falling cube.
 * The top of the screen corresponds to a Y level of 14.
 * @global
 */
const INITIAL_CUBE_Y_POS = 14;

/**
 * The minimum and maximum X coordinates of a cube so that
 * it doesn't go too far to the left or right of the screen.
 * @global
 */
const BOUNDARIES = {
  left: -7,
  right: 7
};

/**
 * The possible hexadecimal colors of the falling cubes.
 * A random color will be chosen from this array
 * when spawning a new cube.
 * @type {number[]}
 * @global
 */
const COLORS = [0xFF0000, 0x00FF00, 0x0000FF];

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

/**
 * All the cubes of the game and their positions (Vector3).
 * It's a 2D array corresponding to the grid of cubes.
 * The number of cubes can be deduced from the boundaries,
 * indeed if the minimum X value is A and the max is B,
 * then the length of the inner dimension is B - A.
 * The number of layers is simply the Y coordinate at which new cubes spawn.
 * @type {Cube[][]}
 * @global
 */
const grid = [];
 
/**
 * The cube currently falling.
 * @type {?Cube}
 * @global
 */
let current_cube;

/**
 * Called only once, it initializes the game.
 */
function _ready() {
  camera.position.z = 10;
  camera.position.y = 6;

  // Generates an empty grid (null values):
  const number_of_layers = INITIAL_CUBE_Y_POS;
  const single_layer_size = BOUNDARIES.right - BOUNDARIES.left;
  for (let i = 0; i < number_of_layers; i++) {
    grid[i] = Array(single_layer_size).fill(null);
  }

  create_ground();
  spawn_cube();

  document.addEventListener("keydown", e => {
    switch (e.key) {
      case "ArrowRight": move_cube_horizontally(1); break;
      case "ArrowLeft": move_cube_horizontally(-1); break;
    }
  });
}

/**
 * Renders the game at every frame.
 */
function _process() {
  requestAnimationFrame(_process);
	renderer.render(scene, camera);
}

/**
 * Creates the ground at the bottom of the screen.
 */
function create_ground() {
  const geometry = new THREE.BoxGeometry(100, 1, 1);
  const material = new THREE.MeshBasicMaterial({ color: 0xAAAAAA });
  const ground = new THREE.Mesh(geometry, material);
  ground.position.y = -1;
  scene.add(ground);
}

/**
 * Spawns a cube of a random color at a random X position at the top of the screen.
 * Once spawned, the cube will start falling at a delay set by {@link DELAY}.
 * A cube will stop falling if there is another below its current Y position.
 * As soon as it gets stuck, it will be added into {@link grid}
 * and {@link current_cube} will get reset with a new cube.
 */
function spawn_cube() {
  // Create a new cube
  const new_cube_position = new Vector3(rand_int(BOUNDARIES.left, BOUNDARIES.right), INITIAL_CUBE_Y_POS, 0);
  current_cube = new Cube(COLORS[rand_int(0, COLORS.length)], new_cube_position);
  scene.add(current_cube.render());
  // Make it go down
  const interval = setInterval(() => {
    if (current_cube.y() === 0 || should_stop_current_cube()) {
      clearInterval(interval);
      if (current_cube.y() === INITIAL_CUBE_Y_POS) {
        alert("You lost");
      } else {
        save_cube_to_grid();
        spawn_cube();
      }
    } else {
      current_cube.down();
    }
  }, DELAY);
}

/**
 * Moves the cube horizontally only if possible.
 * If the move isn't possible, so if it's colliding with another cube,
 * or if the cube is trying to go outside of the grid,
 * then nothing will happen (the movement is canceled).
 * The direction is multiplied by {@link CUBE_SHIFT} to get the new X-coordinates.
 * @param {-1|1} direction The direction in which to move the cube. Use `-1` for left, `1` for right.
 */
function move_cube_horizontally(direction) {
  const single_layer_size = BOUNDARIES.right - BOUNDARIES.left;
  const x_shift = direction * CUBE_SHIFT;
  const new_x = current_cube.x() + x_shift;
  if (is_in_boundaries(new_x)) {
    const next_pos = new Vector3(new_x, current_cube.y(), current_cube.mesh.position.z);
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < single_layer_size; x++) {
        if (grid[y][x] && next_pos.equals(grid[y][x].vec3())) {
          return;
        }
      }
    }
    current_cube.moveX(x_shift);
  }
}

/**
 * Checks if given X-coordinates are within the boundaries of the grid.
 * @param {number} x The X-coordinate
 * @returns {bool}
 */
function is_in_boundaries(x) {
  return x >= BOUNDARIES.left && x <= BOUNDARIES.right;
}

/**
 * Should the {@link current_cube} stop falling?
 * @returns {bool} Whether the cube should stop falling.
 */
function should_stop_current_cube() {
  return grid[current_cube.y() - 1][current_cube.x()] != null;
}

/**
 * Saves a deep copy of the current cube into the grid.
 */
function save_cube_to_grid() {
  grid[current_cube.y()][current_cube.x()] = current_cube.copy();
}

/**
 * Generates a random integer in a given interval.
 * @param {number} min The minimum value (included).
 * @param {number} max The maximum value (excluded).
 * @returns {number} A random integer in [min, max[
 */
function rand_int(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}

_ready();
_process();