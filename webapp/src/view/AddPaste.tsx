import {
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  Spacer,
  Textarea,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { IoArrowBack, IoSend } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import useStreamEvents from "../state/useStreamEvents";

function AddPaste() {
  const [payload, setPayload] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const { addStreamEvents } = useStreamEvents();
  const navigate = useNavigate();

  const onSubmit = useCallback(
    (payload: string, sensitive: boolean) => {
      if (payload.length == 0) return;
      addStreamEvents({ Payload: payload, IsSensitive: sensitive })
        .then(() => {
          payload = "";
          navigate(-1);
        })
        .catch(console.warn);
    },
    [addStreamEvents, navigate]
  );

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
          onClick={() => onSubmit(payload, sensitive)}
          leftIcon={<Icon as={IoSend} boxSize={6} />}
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
