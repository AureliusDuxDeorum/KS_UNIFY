def success_response(data=None, message: str = "success"):
    if data is None:
        data = {}

    return {
        "success": True,
        "message": message,
        **data
    }


def error_response(error: str, data=None):
    if data is None:
        data = {}

    return {
        "success": False,
        "error": error,
        **data
    }
