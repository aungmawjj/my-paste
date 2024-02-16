import { Box, Button, Flex, Icon, Spacer, Textarea } from "@chakra-ui/react";
import axios from "axios";
import { useCallback, useState } from "react";
import { IoArrowBack, IoSend } from "react-icons/io5";
import { useNavigate } from "react-router-dom";

function AddPaste() {
  const [payload, setPayload] = useState("");
  const navigate = useNavigate();

  const onSubmit = useCallback(
    (payload: string) => {
      axios
        .post("/api/event", { Payload: payload })
        .then(() => {
          payload = "";
          navigate(-1);
        })
        .catch(console.error);
    },
    [navigate]
  );

  return (
    <Box pt={{ md: 10 }} pb={6}>
      <Flex py={{base: 4, md: 6}}>
        <Button
          leftIcon={<Icon as={IoArrowBack} boxSize={6} />}
          variant="link"
          colorScheme="brand"
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
        <Spacer />
        <Button
          size="md"
          colorScheme="brand"
          onClick={() => onSubmit(payload)}
          leftIcon={<Icon as={IoSend} boxSize={6} />}
          isDisabled={payload == ""}
        >
          Submit
        </Button>
      </Flex>

      <Textarea
        autoFocus
        size="md"
        rows={10}
        placeholder="Enter Text"
        bg="white"
        onChange={(e) => setPayload(e.target.value)}
      />
    </Box>
  );
}

export default AddPaste;
