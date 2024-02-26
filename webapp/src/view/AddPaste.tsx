import { Box, Button, Checkbox, Flex, Icon, Spacer, Textarea } from "@chakra-ui/react";
import { useState } from "react";
import { IoArrowBack, IoSend } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useStreamState } from "../state/stream";

function AddPaste() {
  const [payload, setPayload] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { streamService } = useStreamState();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (payload.length == 0) return;
    setSubmitting(true);
    streamService
      .addStreamEvent({ Payload: payload, IsSensitive: sensitive })
      .then(() => navigate(-1))
      .catch(console.warn)
      .finally(() => setSubmitting(false));
  };

  return (
    <Box pt={{ md: 10 }} pb={6}>
      <Flex py={{ base: 4, md: 6 }} gap={4}>
        <Button
          leftIcon={<Icon as={IoArrowBack} boxSize={6} />}
          variant="link"
          colorScheme="brand"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Spacer />
        <Checkbox
          size="md"
          colorScheme="brand"
          borderColor="gray.900"
          _dark={{ borderColor: "gray.100" }}
          onChange={() => setSensitive((prev) => !prev)}
        >
          Sensitive
        </Checkbox>
        <Button
          size="md"
          colorScheme="brand"
          onClick={handleSubmit}
          leftIcon={<Icon as={IoSend} boxSize={6} />}
          isLoading={submitting}
          loadingText="Submitting"
        >
          Submit
        </Button>
      </Flex>

      <Textarea
        autoFocus
        size="md"
        rows={10}
        placeholder="Enter Text"
        onChange={(e) => setPayload(e.target.value)}
        bg="white"
        _dark={{ bg: "gray.800" }}
      />
    </Box>
  );
}

export default AddPaste;
