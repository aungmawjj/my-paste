import { useCallback } from "react";
import { Box, Hide, Icon, IconButton, Text } from "@chakra-ui/react";
import { MdAdd, MdContentCopy } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import useStreamEvents from "./useStreamEvents";

function Pastes() {
  const { streamEvents } = useStreamEvents();
  const navigate = useNavigate();

  const onCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(console.error);
  }, []);

  return (
    <>
      <Hide above="md">
        <IconButton
          position="fixed"
          bottom={6}
          right={6}
          zIndex={2}
          aria-label="Add"
          colorScheme="brand"
          width="56px"
          height="56px"
          borderRadius="16px"
          boxShadow="xl"
          icon={<Icon as={MdAdd} boxSize={8} />}
          onClick={() => navigate("/add-paste")}
        />
      </Hide>

      <Box pb={20}>
        {streamEvents.map((e) => (
          <Box
            position="relative"
            key={e.Id}
            py={6}
            px={8}
            my={3}
            bg="white"
            borderRadius="24px"
          >
            <Text fontSize="xs" color="gray">
              {new Date(e.Timestamp * 1000).toLocaleString()}
            </Text>

            <Text pt={2} fontSize="sm">
              {e.Payload}
            </Text>

            <IconButton
              position="absolute"
              top={1}
              right={4}
              size="md"
              aria-label="copy"
              variant="ghost"
              colorScheme="brand"
              onClick={() => onCopy(e.Payload)}
              icon={<Icon as={MdContentCopy} boxSize={6} />}
            />
          </Box>
        ))}
      </Box>
    </>
  );
}

export default Pastes;
