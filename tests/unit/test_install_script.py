from __future__ import annotations

import importlib.util
import shutil
import sys
from pathlib import Path

import pytest


def _load_install_module():
    root = Path(__file__).resolve().parents[2]
    module_path = root / "scripts" / "install.py"
    spec = importlib.util.spec_from_file_location("install_script", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules["install_script"] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def install_module():
    return _load_install_module()


def test_parse_args_uses_new_defaults(install_module) -> None:
    config = install_module.parse_args([])

    assert config.target == Path(".").resolve()
    assert config.mode == "submodule"
    assert config.force is False
    assert config.path == Path("vendor/orchestrator")
    assert config.repo_url is None


def test_parse_args_supports_override_flags(install_module) -> None:
    config = install_module.parse_args(["--target", ".", "--mode", "copy", "--force"])

    assert config.mode == "copy"
    assert config.force is True
    assert config.path == Path("vendor/orchestrator")


def test_copy_mode_excludes_git_and_venv(tmp_path: Path, install_module) -> None:
    source_root = tmp_path / "source"
    target_root = tmp_path / "target"
    destination = target_root / "vendor" / "orchestrator"

    (source_root / "orchestrator").mkdir(parents=True)
    (source_root / "orchestrator" / "state.py").write_text("ok", encoding="utf-8")
    (source_root / ".git").mkdir(parents=True)
    (source_root / ".git" / "HEAD").write_text("ref", encoding="utf-8")
    (source_root / ".venv").mkdir(parents=True)
    (source_root / ".venv" / "pyvenv.cfg").write_text("cfg", encoding="utf-8")
    target_root.mkdir(parents=True)

    install_module.install_copy_mode(source_root=source_root, destination=destination, force=False)

    assert (destination / "orchestrator" / "state.py").exists()
    assert not (destination / ".git").exists()
    assert not (destination / ".venv").exists()


def test_copy_mode_requires_force_if_destination_exists(tmp_path: Path, install_module) -> None:
    source_root = tmp_path / "source"
    target_root = tmp_path / "target"
    destination = target_root / "orchestrator"

    source_root.mkdir(parents=True)
    target_root.mkdir(parents=True)
    destination.mkdir(parents=True)

    with pytest.raises(install_module.InstallError, match="Destination already exists"):
        install_module.install_copy_mode(source_root=source_root, destination=destination, force=False)


def test_submodule_mode_builds_expected_command(tmp_path: Path, install_module, monkeypatch) -> None:
    calls: list[list[str]] = []

    def _fake_run_command(command: list[str], **kwargs):
        calls.append(command)
        return None

    monkeypatch.setattr(install_module, "run_command", _fake_run_command)

    target = tmp_path / "target"
    target.mkdir()

    install_module.install_submodule_mode(
        target=target,
        relative_path=Path("vendor/orchestrator"),
        repo_url="https://github.com/acme/orchestrator.git",
        branch="main",
        force=True,
    )

    assert calls == [
        [
            "git",
            "-C",
            str(target),
            "submodule",
            "add",
            "--force",
            "-b",
            "main",
            "https://github.com/acme/orchestrator.git",
            "vendor/orchestrator",
        ]
    ]


def test_execute_install_submodule_resolves_repo_from_origin(
    tmp_path: Path, install_module, monkeypatch
) -> None:
    source_root = tmp_path / "source"
    target_root = tmp_path / "target"
    source_root.mkdir()
    target_root.mkdir()

    config = install_module.InstallConfig(
        target=target_root,
        path=Path("vendor/orchestrator"),
        mode="submodule",
        branch="main",
        force=False,
        repo_url=None,
        editable=False,
        extract_agents=False,
    )

    captured: dict[str, str | None] = {"repo_url": None}

    def _fake_install_submodule_mode(*, target, relative_path, repo_url, branch, force):
        captured["repo_url"] = repo_url

    monkeypatch.setattr(
        install_module,
        "resolve_repo_url_from_origin",
        lambda source_root: "https://github.com/acme/orchestrator.git",
    )
    monkeypatch.setattr(install_module, "install_submodule_mode", _fake_install_submodule_mode)

    destination, warning, extracted_agents = install_module.execute_install(
        config, source_root=source_root
    )

    assert destination == target_root / "vendor" / "orchestrator"
    assert warning is None
    assert extracted_agents == []
    assert captured["repo_url"] == "https://github.com/acme/orchestrator.git"


def test_execute_install_submodule_requires_repo_url_when_missing(
    tmp_path: Path, install_module, monkeypatch
) -> None:
    source_root = tmp_path / "source"
    target_root = tmp_path / "target"
    source_root.mkdir()
    target_root.mkdir()

    config = install_module.InstallConfig(
        target=target_root,
        path=Path("vendor/orchestrator"),
        mode="submodule",
        branch=None,
        force=False,
        repo_url=None,
        editable=False,
        extract_agents=False,
    )

    monkeypatch.setattr(install_module, "resolve_repo_url_from_origin", lambda source_root: None)

    with pytest.raises(install_module.InstallError, match="Please provide --repo-url"):
        install_module.execute_install(config, source_root=source_root)


def test_editable_install_failure_returns_warning(tmp_path: Path, install_module, monkeypatch) -> None:
    destination = tmp_path / "orchestrator"
    destination.mkdir()

    def _failing_run_command(command: list[str], **kwargs):
        raise install_module.subprocess.CalledProcessError(returncode=1, cmd=command, stderr="fail")

    monkeypatch.setattr(install_module, "run_command", _failing_run_command)

    warning = install_module.attempt_editable_install(destination)

    assert warning is not None
    assert "WARNING: Editable install failed" in warning


def test_execute_install_copy_mode_with_editable_warning(tmp_path: Path, install_module, monkeypatch) -> None:
    source_root = tmp_path / "source"
    target_root = tmp_path / "target"
    source_root.mkdir()
    target_root.mkdir()
    (source_root / "module.py").write_text("x = 1", encoding="utf-8")

    config = install_module.InstallConfig(
        target=target_root,
        path=Path("vendor/orchestrator"),
        mode="copy",
        branch=None,
        force=False,
        repo_url="https://github.com/acme/orchestrator.git",
        editable=True,
        extract_agents=False,
    )

    monkeypatch.setattr(
        install_module,
        "run_command",
        lambda *args, **kwargs: (_ for _ in ()).throw(
            install_module.subprocess.CalledProcessError(returncode=1, cmd="pip", stderr="boom")
        ),
    )

    destination, warning, extracted_agents = install_module.execute_install(
        config, source_root=source_root
    )

    assert destination == target_root / "vendor" / "orchestrator"
    assert destination.exists()
    assert warning is not None
    assert extracted_agents == []

    shutil.rmtree(destination)
