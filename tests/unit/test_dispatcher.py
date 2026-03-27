import unittest
from orchestrator.dispatcher import AgenticDispatcher

class TestDispatcher(unittest.TestCase):
    def setUp(self):
        self.dispatcher = AgenticDispatcher()
        self.dispatcher.register_agent(
            "dummy_coder", 
            ["write_code"], 
            lambda p: {"status": "success", "reflection_passed": True, "data": p}
        )

    def test_routing(self):
        res = self.dispatcher.route_task("write_code for python", {"task": "test"})
        self.assertEqual(res["status"], "success")

    def test_parallel(self):
        tasks = [
            {"intent": "write_code", "payload": {"id": 1}},
            {"intent": "write_code", "payload": {"id": 2}}
        ]
        results = self.dispatcher.execute_parallel(tasks)
        self.assertEqual(len(results), 2)

    def test_reflection_pass(self):
        res = self.dispatcher.reflection_loop({"intent": "write_code", "payload": {}})
        self.assertTrue(res["reflection_passed"])

if __name__ == "__main__":
    unittest.main()
