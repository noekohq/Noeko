# Noeko

Noeko is an app for knowledge base management with a focus on semantic connections.

---

## Getting Started (Self-Hosting)

You can run your own production instance of Noeko using Docker. After cloning this repository and setting up your `.env` file, you can build and launch the application with a single command.

For detailed instructions on configuration, updates, and maintenance, please see the **[➡️ Self-Hosting Guide](documentation/SELF_HOSTING.md)**.

```sh
# First-time launch and updates
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Contributing

We welcome contributions of all kinds, from bug fixes to new features!

If you'd like to contribute to the development of Noeko, please read our **[➡️ Contributing Guide](CONTRIBUTING.md)** to learn how to set up the development environment and submit your changes.

## License

Noeko is licensed under the [PolyForm Small Business License 1.0.0](LICENSE). Please see the `LICENSE` file for full details.