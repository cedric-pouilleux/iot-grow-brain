# Access
- Agent has access to the air-quality-esp32 repository.
- Agent has access to running task in terminal.

# Pinia store
- Reduce the use of stores to only those that are truly persistent throughout the entire application concerned. If this is not the case, stick with classic props/events or provide inject.

- The store must not contain any logic, only its state.

# General code rules
- Avoid callbacks in functions as much as possible.
- A function must not mutate any of its parameters.
- Business naming of variables is important.
- No useless comments. Comment only if the code is tricky to understand. Perfer perfect function and var naming.
- Avoid type cast if not necessary.

# Files generate
- Backend typing is generated on the front end with Orval; do not write to the generated files.

# Front rules
- No API options on the view side, only composable APIs.
- Avoid setInterval, nextTick, and other hacks to solve problems as much as possible.
- Prefer tailwind over custom css.
- Dont forget darkmode when adding feature.