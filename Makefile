.PHONY: verify test-task1 test-task2 artifacts

verify: test-task1 test-task2 artifacts
	@echo "Verification complete. See artifacts/scorecard.json"

test-task1:
	cd task1-ui && npm ci && npm run test && npm run build

test-task2:
	cd evalscope_ext && python3 -m pip install -e ".[dev]" && python3 -m pytest tests/ -q

artifacts:
	python3 -m evalscope_ext.tools.generate_artifacts
	python3 scripts/build_scorecard.py
