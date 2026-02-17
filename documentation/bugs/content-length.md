There's this strange content length bug that appears sometimes on prod. Basically, it looks like:

- Build changes
- App isn't properly served
- Console squawks about "content-lengths" or something like that

I haven't tracked down the cause of this yet, but I'm guessing it has to do with cacheing. What I do know is that I can do:

- `rm -rf dist`
- `sudo reboot now`
- `./scripts/rebuild.sh`

And that usually works to resolve it.

THE REASON FOR THIS:
is the that server was full, the disk space was completely filled, and this was leading to the error.
