<script lang="ts">
    import { Router, Route } from "svelte-routing";
    import Home from "./routes/Home.svelte";

    let url = "";
</script>

<Router {url}>
    <Route path="/">
        <Home />
    </Route>
</Router>
