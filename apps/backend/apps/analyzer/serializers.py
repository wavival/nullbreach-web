from rest_framework import serializers


class ScanRequestSerializer(serializers.Serializer):
    code = serializers.CharField(min_length=1, max_length=100_000)
    language = serializers.CharField(max_length=50, required=False, default="")

    def validate_language(self, value):
        # `language` is interpolated into the Claude prompt, so collapse it to a
        # single short token to defeat multi-line prompt-injection payloads.
        first_line = value.strip().splitlines()[0] if value.strip() else ""
        return first_line[:50]


class VulnerabilitySerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    severity = serializers.ChoiceField(choices=["critical", "high", "medium", "low", "info"])
    line = serializers.IntegerField(allow_null=True)
    description = serializers.CharField()
    recommendation = serializers.CharField()


class ScanResultSerializer(serializers.Serializer):
    vulnerabilities = VulnerabilitySerializer(many=True)
    summary = serializers.CharField()
    risk_score = serializers.IntegerField(min_value=0, max_value=100)
