function preload() {
  painter.preload();
}

function setup() {
  reset();
  painter.setup();
  frameRate(fps);
}

function reset() {
  // 1. Set the values of internal variables.
  moveFrames = 16;
  lose = false;
  score = 0;

  // 2. Create the tiles.
  tiles.forEach((tile) => tile.clear());

  // 3. Determine the starting tiles.
  spawn(initialSpawn);

  // 4. Allow input.
  ready = true;
}

function spawn(n) {
  // Recursively creates as many tiles as possible, up to n many, in random
  // locations on the board.
  // Each tile has a 80% probability of spawning 2, and a 20% probability of
  // spawning 4. When picking a real number x from a uniform distribution over
  // [1,2.25), we get P(floor(x) = 1) = 80% and P(floor(x) = 2) = 20%.
  getEmptyTiles()
    .map((tile) => [Math.random(), tile])
    .sort()
    .slice(0, n)
    .forEach(([_, tile]) => tile.spawn(randInt(1, 2.25)));
}

function draw() {
  background(painter.bgColor);

  drawBoard();
  drawScore();
}

function refreshTiles() {
  tiles.forEach((tile) => tile.finishUpdating());
}

function drawBoard() {
  push();
  {
    translate(painter.centre, painter.centre);

    if (moveFrames > 5) {
      const t = 1 - (moveFrames - 5) / 10;
      tiles.forEach((tile) => tile.paintBlank());
      tiles.forEach((tile) => tile.paintSpawn(t));
      tiles.forEach((tile) => tile.paintSlide(t));

      moveFrames--;
    } else if (moveFrames > 0) {
      const t = 1 + (3 - abs(3 - moveFrames)) / 20;
      tiles.forEach((tile) => tile.paintPlain());
      tiles.forEach((tile) => tile.paintFlash(t));

      moveFrames--;
      if (moveFrames === 0) {
        refreshTiles();
      }
    } else {
      // (moveFrames === 0)
      tiles.forEach((tile) => tile.paintPlain());
      noLoop();
    }
  }
  pop();
}

function drawScore() {
  painter.paintScore(score);
}

function keyPressed() {
  if (!ready) {
    return;
  }

  if (moveFrames > 5) {
    // Inputs are locked while the tiles are moving.
    // For smoothness, inputs unlock for the last few frames of the move.
    return;
  }

  if (lose && moveFrames === 0) {
    alert(`You lose! Score: ${score}`);
    reset();
    return;
  }

  direction = Direction.fromKeycode(keyCode);
  if (direction !== null) {
    move(direction);
  }
}

function touchStarted() {
  if (!ready) {
    return false;
  }

  touchStart.x = mouseX;
  touchStart.y = mouseY;
  touchStart.t = frameCount;

  // Prevent the default touch action.
  return false;
}

function touchEnded() {
  if (!ready) {
    return false;
  }

  let delta = {
    x: mouseX - touchStart.x,
    y: mouseY - touchStart.y,
    t: frameCount - touchStart.t,
  };

  let magnitude = delta.x ** 2 + delta.y ** 2;
  if (magnitude < distanceThreshold ** 2) {
    // Not far enough.
    return false;
  }
  if (magnitude < (delta.t * speedThreshold) ** 2) {
    // Too slow.
    return false;
  }

  const heading = Math.atan2(delta.y, delta.x);
  const direction = Direction.fromHeading(heading);
  move(direction);

  // Prevent the default touch action.
  return false;
}

function move(direction) {
  refreshTiles();

  console.log(`Moving in direction: ${direction}`);
  moves[direction].forEach(slide);

  if (unmoved()) {
    return;
  }

  spawn(moveSpawn);
  lose = full() && stuck();
  moveFrames = 15;

  loop();
}

function slide(r) {
  // r is a list of tile indices corresponding to a row parallel to the
  //   direction of the player's move. Earlier values in r correspond to tiles
  //   further along the direction of the move.
  let i = 0;
  let j = 0;
  while (j < r.length) {
    const targetTile = tiles[r[i]];
    const currentTile = tiles[r[j]];
    if (currentTile.isEmpty() || currentTile === targetTile) {
      // do nothing and continue
      currentTile.target = currentTile;
      j++;
    } else if (targetTile.isEmpty()) {
      targetTile.setValue(currentTile.value);
      currentTile.clear();
      currentTile.target = targetTile;
      j++;
    } else if (currentTile.value === targetTile.value) {
      targetTile.merge();
      currentTile.clear();
      currentTile.target = targetTile;
      i++;
      j++;
    } else if (currentTile.value !== targetTile.value) {
      i++;
    }
  }
}

function windowResized() {
  painter.autoSize();
}
