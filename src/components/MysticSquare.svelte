<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import Icon from "./Icon.svelte";

    //
    // Component Variables, Constants & Types
    //

    // Defining the Square type, which includes properties for position, movement, and display
    type Square = {
        initial_x?: number;
        initial_y?: number;
        dx: number;
        dy: number;
        last_dx: number;
        last_dy: number;
        push_x: number;
        push_y: number;
        x: number;
        y: number;
        text: number;
    } | null;

    // Constants for grid gap and drag threshold
    const gap = 2;
    const drag_threshold = 0.15;

    // State variables for game logic
    let won = true;
    let highlight_empty = false;
    let square_container_el: HTMLElement;

    // Variables to store information about free space around a square
    let left_raycast: ReturnType<typeof find_free_space>;
    let right_raycast: ReturnType<typeof find_free_space>;
    let top_raycast: ReturnType<typeof find_free_space>;
    let bottom_raycast: ReturnType<typeof find_free_space>;

    // Initialize the squares grid
    let squares: Square[] = [];

    // Adding squares to the grid, leaving the last square empty
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            if (x === 3 && y === 3) {
                squares.push(null);
            } else {
                squares.push({
                    dx: 0,
                    dy: 0,
                    last_dx: 0,
                    last_dy: 0,
                    push_x: 0,
                    push_y: 0,
                    x: x,
                    y: y,
                    text: y * 4 + x,
                });
            }
        }
    }

    // Variables to manage square dragging state
    let dragging_square_index: number | null = null;
    let dragging_offset_x = 0;
    let dragging_offset_y = 0;

    //
    // Functions and Event Handlers
    //

    function handle_square_mousedown(
        event: MouseEvent,
        square: Square,
        index: number
    ) {
        if (square === null) return;

        const el = event.target as HTMLDivElement;
        if (!el) return;

        const rect = el.getBoundingClientRect();

        // This initial position is used to calculate the offset of the mouse cursor from the square's top left corner.
        if (!square.initial_x) {
            square.initial_x = rect.left;
        }
        if (!square.initial_y) {
            square.initial_y = rect.top;
        }

        dragging_offset_x = event.clientX - square.initial_x;
        dragging_offset_y = event.clientY - square.initial_y;
        dragging_square_index = index;

        // We use the find free space function to check in which directions the square can move and which squares are in the way.
        left_raycast = find_free_space(square.x, square.y, "left");
        right_raycast = find_free_space(square.x, square.y, "right");
        top_raycast = find_free_space(square.x, square.y, "top");
        bottom_raycast = find_free_space(square.x, square.y, "bottom");

        // Svelte reactivity requires us to reassign the squares array to trigger a re-render
        squares = squares;
    }

    function handle_square_mousemove(event: MouseEvent) {
        const el = square_container_el.firstElementChild;
        if (!el) return;

        if (dragging_square_index === null) return;

        const dragging_square = squares[dragging_square_index];
        if (dragging_square === null) return;

        if (
            dragging_square.initial_x === undefined ||
            dragging_square.initial_y === undefined
        )
            return;

        // We use the last_dx and last_dy properties to calculate the delta difference between the last mousemove event and the current one.
        dragging_square.last_dx = dragging_square.dx;
        dragging_square.last_dy = dragging_square.dy;
        dragging_square.dx =
            event.clientX - dragging_square.initial_x - dragging_offset_x;
        dragging_square.dy =
            event.clientY - dragging_square.initial_y - dragging_offset_y;

        // Based on the square's position and the free space around it, we calculate the maximum distance it can be dragged in each direction.
        const size = el.getBoundingClientRect().width;
        const neighbours = get_neighbours(dragging_square.x, dragging_square.y);
        const right_limit = neighbours.right ? gap : size + gap * 2;
        const left_limit = neighbours.left ? gap : size + gap * 2;
        const top_limit = neighbours.top ? gap : size + gap * 2;
        const bottom_limit = neighbours.bottom ? gap : size + gap * 2;

        if (dragging_square.dx >= right_limit) {
            // We check if there is an empty space to the right of the square and if there are any squares in the way.
            if (
                right_raycast.empty_position &&
                right_raycast.squares_between.length > 0
            ) {
                const delta_diff = dragging_square.dx - dragging_square.last_dx;

                right_raycast.squares_between.forEach((i) => {
                    const pushed_square = squares[i];

                    // We make sure that the square is only pushed in one direction
                    if (
                        pushed_square &&
                        delta_diff > 0 &&
                        dragging_square.dx >= pushed_square.push_x
                    ) {
                        pushed_square.push_x += delta_diff;

                        // We limit the maximum distance the square can be pushed
                        if (pushed_square.push_x >= size + gap * 2) {
                            pushed_square.push_x = size + gap * 2;
                        }
                    }
                });
            } else {
                // If there is no empty space or there are no squares in the way, we limit the square's movement to the maximum distance.
                dragging_square.dx = right_limit;
            }
        }
        // We repeat the same process for the other directions.
        if (
            dragging_square.dx < 0 &&
            Math.abs(dragging_square.dx) >= left_limit
        ) {
            if (
                left_raycast.empty_position &&
                left_raycast.squares_between.length > 0
            ) {
                const delta_diff = dragging_square.dx - dragging_square.last_dx;

                left_raycast.squares_between.forEach((i) => {
                    const pushed_square = squares[i];
                    if (
                        pushed_square &&
                        delta_diff < 0 &&
                        dragging_square.dx <= pushed_square.push_x
                    ) {
                        pushed_square.push_x += delta_diff;
                        if (pushed_square.push_x <= -size - gap * 2) {
                            pushed_square.push_x = -size - gap * 2;
                        }
                    }
                });
            } else {
                dragging_square.dx = -left_limit;
            }
        }
        if (
            dragging_square.dy < 0 &&
            Math.abs(dragging_square.dy) >= top_limit
        ) {
            if (
                top_raycast.empty_position &&
                top_raycast.squares_between.length > 0
            ) {
                const delta_diff = dragging_square.dy - dragging_square.last_dy;

                top_raycast.squares_between.forEach((i) => {
                    const pushed_square = squares[i];
                    if (
                        pushed_square &&
                        delta_diff < 0 &&
                        dragging_square.dy <= pushed_square.push_y
                    ) {
                        pushed_square.push_y += delta_diff;
                        if (pushed_square.push_y <= -size - gap * 2) {
                            pushed_square.push_y = -size - gap * 2;
                        }
                    }
                });
            } else {
                dragging_square.dy = -top_limit;
            }
        }
        if (dragging_square.dy >= bottom_limit) {
            if (
                bottom_raycast.empty_position &&
                bottom_raycast.squares_between.length > 0
            ) {
                const delta_diff = dragging_square.dy - dragging_square.last_dy;

                bottom_raycast.squares_between.forEach((i) => {
                    const pushed_square = squares[i];
                    if (
                        pushed_square &&
                        delta_diff > 0 &&
                        dragging_square.dy >= pushed_square.push_y
                    ) {
                        pushed_square.push_y += delta_diff;
                        if (pushed_square.push_y >= size + gap * 2) {
                            pushed_square.push_y = size + gap * 2;
                        }
                    }
                });
            } else {
                dragging_square.dy = bottom_limit;
            }
        }

        // We always limit the square's movement to the maximum distance.
        if (dragging_square.dx >= size + gap * 2) {
            dragging_square.dx = size + gap * 2;
        }

        if (dragging_square.dy >= size + gap * 2) {
            dragging_square.dy = size + gap * 2;
        }

        if (dragging_square.dx <= -size - gap * 2) {
            dragging_square.dx = -size - gap * 2;
        }

        if (dragging_square.dy <= -size - gap * 2) {
            dragging_square.dy = -size - gap * 2;
        }

        // We use the drag threshold to determine if the square should be highlighted as a potential drop target.
        highlight_empty = false;

        // RIGHT
        if (dragging_square.dx >= (size + gap * 2) * drag_threshold) {
            highlight_empty = true;
        }

        // LEFT
        if (
            dragging_square.dx < 0 &&
            Math.abs(dragging_square.dx) > (size + gap * 2) * drag_threshold
        ) {
            highlight_empty = true;
        }

        // TOP
        if (
            dragging_square.dy < 0 &&
            Math.abs(dragging_square.dy) > (size + gap * 2) * drag_threshold
        ) {
            highlight_empty = true;
        }

        // BOTTOM
        if (dragging_square.dy >= (size + gap * 2) * drag_threshold) {
            highlight_empty = true;
        }

        squares = squares;
    }

    function handle_square_mouseup() {
        // In any case, we always reset the highlight state.
        highlight_empty = false;

        // We use the first item in the grid div to get the square size.
        const el = square_container_el.firstElementChild;
        if (!el || dragging_square_index === null) return;

        const dragging_square = squares[dragging_square_index];
        if (dragging_square === null) return;

        let size = el.getBoundingClientRect().width;
        let did_move = false;

        const empty_square_index = squares.findIndex(
            (square) => square === null
        );

        // We check if the square has been dragged far enough to be considered a move.

        // RIGHT
        if (dragging_square.dx >= (size + gap * 2) * drag_threshold) {
            dragging_square.x += 1;
            did_move = true;
        }

        // LEFT
        if (
            dragging_square.dx < 0 &&
            Math.abs(dragging_square.dx) > (size + gap * 2) * drag_threshold
        ) {
            dragging_square.x -= 1;
            did_move = true;
        }

        // TOP
        if (
            dragging_square.dy < 0 &&
            Math.abs(dragging_square.dy) > (size + gap * 2) * drag_threshold
        ) {
            dragging_square.y -= 1;
            did_move = true;
        }

        // BOTTOM
        if (dragging_square.dy >= (size + gap * 2) * drag_threshold) {
            dragging_square.y += 1;
            did_move = true;
        }

        // We reset the square's movement properties for all squares.
        squares.forEach((square) => {
            if (square) {
                square.dx = 0;
                square.dy = 0;
                square.push_x = 0;
                square.push_y = 0;
            }
        });

        // If the square has been moved, we update the squares array to reflect the new positions. Here the HTML elements are also re-ordered.
        if (did_move) {
            dragging_square.initial_x = undefined;
            dragging_square.initial_y = undefined;

            // We go through the squares between the empty space and the dragged square and update their grid positions. We also reset the push properties. This is done for all directions.
            if (
                right_raycast.empty_position &&
                right_raycast.squares_between.length > 0
            ) {
                for (
                    let i = right_raycast.squares_between.length - 1;
                    i >= 0;
                    i--
                ) {
                    const pushed_square =
                        squares[right_raycast.squares_between[i]];
                    if (pushed_square) {
                        pushed_square.push_x = 0;
                        pushed_square.x += 1;
                        squares[right_raycast.squares_between[i] + 1] = {
                            ...pushed_square,
                        };
                        squares[right_raycast.squares_between[i]] = null;
                    }
                }
                squares[right_raycast.squares_between[0]] = {
                    ...dragging_square,
                };
                squares[dragging_square_index] = null;
            } else if (
                left_raycast.empty_position &&
                left_raycast.squares_between.length > 0
            ) {
                for (
                    let i = left_raycast.squares_between.length - 1;
                    i >= 0;
                    i--
                ) {
                    const pushed_square =
                        squares[left_raycast.squares_between[i]];
                    if (pushed_square) {
                        pushed_square.push_x = 0;
                        pushed_square.x -= 1;
                        squares[left_raycast.squares_between[i] - 1] = {
                            ...pushed_square,
                        };
                        squares[left_raycast.squares_between[i]] = null;
                    }
                }
                squares[left_raycast.squares_between[0]] = {
                    ...dragging_square,
                };
                squares[dragging_square_index] = null;
            } else if (
                top_raycast.empty_position &&
                top_raycast.squares_between.length > 0
            ) {
                for (
                    let i = top_raycast.squares_between.length - 1;
                    i >= 0;
                    i--
                ) {
                    const pushed_square =
                        squares[top_raycast.squares_between[i]];
                    if (pushed_square) {
                        pushed_square.push_y = 0;
                        pushed_square.y -= 1;
                        squares[top_raycast.squares_between[i] - 4] = {
                            ...pushed_square,
                        };
                        squares[top_raycast.squares_between[i]] = null;
                    }
                }
                squares[top_raycast.squares_between[0]] = {
                    ...dragging_square,
                };
                squares[dragging_square_index] = null;
            } else if (
                bottom_raycast.empty_position &&
                bottom_raycast.squares_between.length > 0
            ) {
                for (
                    let i = bottom_raycast.squares_between.length - 1;
                    i >= 0;
                    i--
                ) {
                    const pushed_square =
                        squares[bottom_raycast.squares_between[i]];
                    if (pushed_square) {
                        pushed_square.push_y = 0;
                        pushed_square.y += 1;
                        squares[bottom_raycast.squares_between[i] + 4] = {
                            ...pushed_square,
                        };
                        squares[bottom_raycast.squares_between[i]] = null;
                    }
                }
                squares[bottom_raycast.squares_between[0]] = {
                    ...dragging_square,
                };
                squares[dragging_square_index] = null;
            } else {
                squares[empty_square_index] = { ...dragging_square };
                squares[dragging_square_index] = null;
            }
        }

        // In any case, we reset the dragging state and trigger reactivity.
        squares = squares;
        dragging_square_index = null;
    }

    function get_neighbours(x: number, y: number) {
        return {
            left:
                x > 0
                    ? squares.find(
                          (square) =>
                              square && square.x === x - 1 && square.y === y
                      )
                    : "wall",
            right:
                x < 3
                    ? squares.find(
                          (square) =>
                              square && square.x === x + 1 && square.y === y
                      )
                    : "wall",
            top:
                y > 0
                    ? squares.find(
                          (square) =>
                              square && square.x === x && square.y === y - 1
                      )
                    : "wall",
            bottom:
                y < 3
                    ? squares.find(
                          (square) =>
                              square && square.x === x && square.y === y + 1
                      )
                    : "wall",
        };
    }

    function find_free_space(
        x: number,
        y: number,
        direction: "left" | "right" | "top" | "bottom"
    ) {
        const xi = direction === "left" ? -1 : direction === "right" ? 1 : 0;
        const yi = direction === "top" ? -1 : direction === "bottom" ? 1 : 0;

        // Early exit if the origin is at the edge in the specified direction
        if (
            (x === 0 && direction === "left") ||
            (x === 3 && direction === "right") ||
            (y === 0 && direction === "top") ||
            (y === 3 && direction === "bottom")
        ) {
            return { empty_position: null, squares_between: [] };
        }

        let empty_position = null;
        let squares_between: number[] = [];

        for (let i = 1; i < 4; i++) {
            let next_x = x + xi * i;
            let next_y = y + yi * i;

            // Skip if out of bounds
            if (next_x < 0 || next_x > 3 || next_y < 0 || next_y > 3) {
                break;
            }

            const neighbour_index = squares.findIndex(
                (square) => square && square.x === next_x && square.y === next_y
            );

            if (neighbour_index === -1) {
                empty_position = { x: next_x, y: next_y };
                break;
            } else {
                squares_between.push(neighbour_index);
            }
        }

        return { empty_position, squares_between };
    }

    function check_if_won(..._: any) {
        if (squares[squares.length - 1] !== null) {
            won = false;
            return;
        }

        for (let i = 0; i < squares.length - 1; i++) {
            const square = squares[i];
            if (square === null || square.text !== i) {
                won = false;
                return;
            }
        }

        won = true;
    }

    onMount(() => {
        window.addEventListener("mousemove", handle_square_mousemove);
        window.addEventListener("mouseup", handle_square_mouseup);
    });

    onDestroy(() => {
        window.removeEventListener("mousemove", handle_square_mousemove);
        window.removeEventListener("mouseup", handle_square_mouseup);
    });

    $: check_if_won(squares);
</script>

<div
    class="shadow-floor rounded-4 w-fit h-fit grid grid-rows-1fr-auto p-2 gap-2 bg-stone-200 border border-white text-white"
>
    <div class="flex w-64 h-64 relative">
        <div
            bind:this={square_container_el}
            class:cursor-grabbing={dragging_square_index !== null}
            class="relative rounded-4 w-full h-full border border-white shadow-floor shadow-inner bg-stone-200 p-1 grid grid-cols-4 grid-rows-4 gap-1 overflow-hidden"
        >
            {#each squares as square, i}
                {#if square === null}
                    <div
                        class:bg-stone-300={highlight_empty}
                        class="rounded-4"
                    ></div>
                {:else}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        on:mousedown={(e) =>
                            handle_square_mousedown(e, square, i)}
                        class="relative flex items-center justify-center text-24 font-bold text-stone-500 select-none border border-white rounded-4 shadow-floor {dragging_square_index !==
                        null
                            ? 'cursor-grabbing'
                            : 'cursor-grab'} {dragging_square_index === i
                            ? 'bg-stone-300'
                            : dragging_square_index === null
                              ? 'bg-stone-200 hover:bg-stone-300'
                              : 'bg-stone-200'}"
                        style="transform: translate({square.dx +
                            square.push_x}px, {square.dy + square.push_y}px);"
                    >
                        {square.text + 1}
                        <span
                            class="pointer-events-none absolute opacity-50 font-normal text-10 bottom-0.25 right-0.25"
                            >{square.x},{square.y}</span
                        >
                    </div>
                {/if}
            {/each}
        </div>
    </div>
    <div class="flex items-center justify-between">
        <span class="text-stone-500/50 font-bold select-none"
            >Mystic Square 2000</span
        >
        <div
            class="flex items-center justify-center rounded-full h-6 w-6 border-3 {won
                ? 'border-green-200 bg-green-600'
                : 'border-red-200 bg-red-500'}"
        >
            <Icon
                weight="font-medium"
                size="text-18"
                classes="text-white"
                name={won
                    ? "sentiment_satisfied"
                    : "sentiment_extremely_dissatisfied"}
            />
        </div>
    </div>
</div>
