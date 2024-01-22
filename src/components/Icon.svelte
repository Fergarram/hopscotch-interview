<script lang="ts">
    import type { MaterialSymbol } from "../lib/types";

    export let name: MaterialSymbol;
    export let classes = "";
    export let style = "";
    // @FIXME: Make the width and height static based on size.
    //         For this to happen I need to change the size prop type to a number.
    export let size = "text-24";
    export let weight = "font-bold";

    const extract_number = (str: string): number =>
        parseInt(str.match(/\d+/)?.[0] ?? "0", 10);
    $: style = `max-width: ${extract_number(
        size
    )}px; max-height: ${extract_number(size)}px; ${style}`;
</script>

<span
    aria-hidden="true"
    {style}
    class="material-symbols-outlined select-none overflow-hidden {weight} {size} {classes}"
    >{name}</span
>
